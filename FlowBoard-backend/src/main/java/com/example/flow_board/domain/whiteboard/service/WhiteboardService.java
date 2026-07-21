package com.example.flow_board.domain.whiteboard.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
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
      WHITEBOARD_POINT_LIST_TYPE = new TypeReference<>() {
  };

  private final BoardRepository boardRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final WhiteboardStrokeRepository whiteboardStrokeRepository;
  private final WhiteboardEventPublisher whiteboardEventPublisher;
  private final ActivityLogService activityLogService;
  private final ObjectMapper objectMapper;

  /**
   * 화이트보드 선 저장
   */
  @Transactional
  public WhiteboardStrokeResponse createStroke(
      User user,
      Long boardId,
      WhiteboardStrokeCreateRequest request
  ) {
    Board board = getBoardById(boardId);

    BoardMember boardMember = getBoardMember(
        board,
        user
    );

    validateWhiteboardWritePermission(
        boardMember
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

    String pointsJson = convertPointsToJson(
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
     * 화이트보드에 새로운 선이 추가된 활동을 저장
     * PEN과 ERASER 모두 선 데이터로 저장되므로 같은 활동 종류를 사용
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
     * 트랜잭션 커밋 후
     * /topic/boards/{boardId}/whiteboard로 전송됩니다.
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
   */
  public List<WhiteboardStrokeResponse> getStrokes(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    validateWhiteboardReadPermission(
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
   * 특정 보드의 화이트보드 전체 삭제
   */
  @Transactional
  public void clearWhiteboard(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    BoardMember boardMember = getBoardMember(
        board,
        user
    );

    validateWhiteboardWritePermission(
        boardMember
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
     * 삭제 트랜잭션이 정상 커밋된 뒤 모든 구독자에게 전체 삭제 이벤트를 전송
     */
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.cleared(
            board.getId()
        )
    );
  }

  /**
   * 화이트보드 도구에 따라 활동 로그에 표시할 문구를 반환
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
   * 현재 사용자의 보드 멤버 정보 조회
   */
  private BoardMember getBoardMember(
      Board board,
      User user
  ) {
    return boardMemberRepository
        .findByBoardAndUser(
            board,
            user
        )
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_ACCESS_DENIED
            )
        );
  }

  /**
   * 화이트보드 조회 권한 검사
   * OWNER, MEMBER, VIEWER 모두 조회할 수 있음
   */
  private void validateWhiteboardReadPermission(
      Board board,
      User user
  ) {
    getBoardMember(
        board,
        user
    );
  }

  /**
   * 화이트보드 쓰기 권한 검사
   * OWNER와 MEMBER만 선 저장 및 전체 삭제를 할 수 있음
   */
  private void validateWhiteboardWritePermission(
      BoardMember boardMember
  ) {
    if (boardMember.getRole() == BoardRole.VIEWER) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_WRITE_ACCESS_DENIED
      );
    }
  }

  /**
   * 좌표 목록을 JSON 문자열로 변환
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
   * JSON 문자열을 좌표 목록으로 변환
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