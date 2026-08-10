package com.example.flow_board.domain.whiteboard.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.whiteboard.dto.WhiteboardPoint;
import com.example.flow_board.domain.whiteboard.dto.request.WhiteboardStrokeCreateRequest;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardStrokeResponse;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardStroke;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardStrokeRepository;
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardEventPublisher;
import com.example.flow_board.domain.whiteboard.websocket.WhiteboardWebSocketEvent;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhiteboardService {

  private static final TypeReference<List<WhiteboardPoint>>
          WHITEBOARD_POINT_LIST_TYPE =
          new TypeReference<>() {
          };

  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;
  private final WhiteboardStrokeRepository whiteboardStrokeRepository;
  private final WhiteboardEventPublisher whiteboardEventPublisher;
  private final ActivityLogService activityLogService;
  private final ObjectMapper objectMapper;

  /**
   * 화이트보드 선 저장
   *
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public WhiteboardStrokeResponse createStroke(
          User user,
          Long boardId,
          WhiteboardStrokeCreateRequest request
  ) {
    Board board =
            getBoardById(boardId);

    /*
     * VIEWER는 화이트보드에
     * 선을 추가할 수 없습니다.
     */
    boardPermissionService.validateWritePermission(
            board,
            user
    );

    boolean alreadyExists =
            whiteboardStrokeRepository
                    .existsByBoardAndClientStrokeId(
                            board,
                            request.clientStrokeId()
                    );

    if (alreadyExists) {
      throw new CustomException(
              ErrorCode.WHITEBOARD_STROKE_ALREADY_EXISTS
      );
    }

    String pointsJson =
            convertPointsToJson(
                    request.points()
            );

    WhiteboardStroke whiteboardStroke =
            new WhiteboardStroke(
                    board,
                    user,
                    request.clientStrokeId(),
                    request.tool(),
                    request.color(),
                    request.lineWidth(),
                    pointsJson
            );

    WhiteboardStroke savedStroke =
            whiteboardStrokeRepository.save(
                    whiteboardStroke
            );

    WhiteboardStrokeResponse response =
            WhiteboardStrokeResponse.from(
                    savedStroke,
                    request.points()
            );

    /*
     * 현재는 선 단위로 활동 로그를 기록합니다.
     * 다음 단계에서 화이트보드 특성상 로그가
     * 너무 많이 쌓이지 않도록 보완합니다.
     */
    activityLogService.recordActivity(
            board,
            user,
            ActivityType.WHITEBOARD_STROKE_CREATED,
            savedStroke.getId(),
            "화이트보드 선",
            user.getNickname()
                    + "님이 화이트보드에 "
                    + getToolDescription(request)
                    + "을(를) 추가했습니다."
    );

    /*
     * DB 트랜잭션이 정상 커밋된 후
     * WebSocket 이벤트가 전송됩니다.
     */
    whiteboardEventPublisher.publish(
            WhiteboardWebSocketEvent.strokeCreated(
                    board.getId(),
                    response
            )
    );

    return response;
  }

  /**
   * 특정 보드의 화이트보드 선 전체 조회
   *
   * OWNER, MEMBER, VIEWER 모두 가능합니다.
   */
  public List<WhiteboardStrokeResponse> getStrokes(
          User user,
          Long boardId
  ) {
    Board board =
            getBoardById(boardId);

    boardPermissionService.validateReadPermission(
            board,
            user
    );

    return whiteboardStrokeRepository
            .findByBoardOrderByIdAsc(board)
            .stream()
            .map(
                    stroke ->
                            WhiteboardStrokeResponse.from(
                                    stroke,
                                    convertJsonToPoints(
                                            stroke.getPointsJson()
                                    )
                            )
            )
            .toList();
  }

  /**
   * 화이트보드 전체 삭제
   *
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public void clearWhiteboard(
          User user,
          Long boardId
  ) {
    Board board =
            getBoardById(boardId);

    /*
     * VIEWER는 전체 삭제할 수 없습니다.
     */
    boardPermissionService.validateWritePermission(
            board,
            user
    );

    whiteboardStrokeRepository.deleteByBoard(
            board
    );

    activityLogService.recordActivity(
            board,
            user,
            ActivityType.WHITEBOARD_CLEARED,
            null,
            null,
            user.getNickname()
                    + "님이 화이트보드를 전체 삭제했습니다."
    );

    /*
     * 트랜잭션 커밋 후 모든 구독자에게
     * 전체 삭제 이벤트를 전송합니다.
     */
    whiteboardEventPublisher.publish(
            WhiteboardWebSocketEvent.cleared(
                    board.getId()
            )
    );
  }

  /**
   * 화이트보드 도구에 따른
   * 활동 로그 표시 문구입니다.
   */
  private String getToolDescription(
          WhiteboardStrokeCreateRequest request
  ) {
    return switch (request.tool()) {
      case PEN -> "새로운 선";
      case ERASER -> "지우개 선";
    };
  }

  /**
   * 보드 조회
   */
  private Board getBoardById(
          Long boardId
  ) {
    return boardRepository
            .findById(boardId)
            .orElseThrow(
                    () -> new CustomException(
                            ErrorCode.BOARD_NOT_FOUND
                    )
            );
  }

  /**
   * 좌표 목록을 JSON 문자열로 변환합니다.
   */
  private String convertPointsToJson(
          List<WhiteboardPoint> points
  ) {
    try {
      return objectMapper.writeValueAsString(
              points
      );
    } catch (JsonProcessingException exception) {
      throw new CustomException(
              ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }

  /**
   * JSON 문자열을 좌표 목록으로 복원합니다.
   */
  private List<WhiteboardPoint> convertJsonToPoints(
          String pointsJson
  ) {
    try {
      return objectMapper.readValue(
              pointsJson,
              WHITEBOARD_POINT_LIST_TYPE
      );
    } catch (JsonProcessingException exception) {
      throw new CustomException(
              ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }
}