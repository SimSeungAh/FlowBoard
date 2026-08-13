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
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

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
  private final JsonMapper jsonMapper;

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

    /**
     * 같은 사용자가 같은 보드에서 계속 작업할 경우
     * 5분에 최대 하나의 화이트보드 활동 로그만 남깁니다.
     */
    activityLogService
        .recordWhiteboardActivityIfNeeded(
            board,
            user,
            savedStroke.getId()
        );

    /**
     * DB 트랜잭션 정상 커밋 후
     * WebSocket으로 선 생성 이벤트가 전달됩니다.
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
   * 화이트보드 선 전체 조회
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
        .findByBoardOrderByIdAsc(
            board
        )
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
   * 화이트보드 개별 선 삭제
   *
   * OWNER와 MEMBER만 가능합니다.
   *
   * Undo 또는 선 단위 지우기에서 사용합니다.
   */
  @Transactional
  public void deleteStroke(
      User user,
      Long boardId,
      Long strokeId
  ) {
    Board board =
        getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    WhiteboardStroke stroke =
        whiteboardStrokeRepository
            .findById(strokeId)
            .orElseThrow(
                () -> new CustomException(
                    ErrorCode.WHITEBOARD_STROKE_NOT_FOUND
                )
            );

    /*
     * URL의 boardId와 실제 Stroke의 보드가
     * 반드시 일치해야 합니다.
     *
     * 이를 검사하지 않으면
     * 다른 보드의 strokeId를 이용해
     * 잘못된 선을 삭제할 수 있습니다.
     */
    if (
        !stroke.getBoard()
            .getId()
            .equals(board.getId())
    ) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_STROKE_NOT_FOUND
      );
    }

    whiteboardStrokeRepository.delete(
        stroke
    );

    /**
     * 개별 선 삭제는 Undo/선 지우기에서
     * 매우 자주 발생할 수 있으므로
     * 활동 로그에는 매번 기록하지 않습니다.
     *
     * 기존 선 생성 로그도 5분 단위로 제한하고 있기 때문에
     * 같은 취지로 활동 로그 과다 생성을 방지합니다.
     */

    /**
     * DB 트랜잭션이 정상 커밋된 후
     * 다른 참여자에게 해당 Stroke 삭제를 알립니다.
     */
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.strokeDeleted(
            board.getId(),
            strokeId
        )
    );
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

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    whiteboardStrokeRepository.deleteByBoard(
        board
    );

    /**
     * 전체 삭제는 중요한 활동이므로
     * 시간 제한 없이 항상 기록합니다.
     */
    activityLogService.recordActivity(
        board,
        user,
        ActivityType.WHITEBOARD_CLEARED,
        null,
        null,
        user.getNickname()
            + "님이 화이트보드를 전체 삭제했습니다."
    );

    /**
     * 다른 사용자 Canvas에도
     * 전체 삭제 이벤트를 전달합니다.
     */
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.cleared(
            board.getId()
        )
    );
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
   * 좌표 목록 -> JSON
   */
  private String convertPointsToJson(
      List<WhiteboardPoint> points
  ) {
    try {
      return jsonMapper.writeValueAsString(
          points
      );
    } catch (JacksonException exception) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }

  /**
   * JSON -> 좌표 목록
   */
  private List<WhiteboardPoint> convertJsonToPoints(
      String pointsJson
  ) {
    try {
      return jsonMapper.readValue(
          pointsJson,
          WHITEBOARD_POINT_LIST_TYPE
      );
    } catch (JacksonException exception) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }
}