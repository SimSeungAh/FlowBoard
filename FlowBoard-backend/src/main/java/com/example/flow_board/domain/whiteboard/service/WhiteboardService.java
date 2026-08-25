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
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardStroke;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardRepository;
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

  private static final String DEFAULT_WHITEBOARD_TITLE =
      "기본 화이트보드";

  private static final TypeReference<List<WhiteboardPoint>>
      WHITEBOARD_POINT_LIST_TYPE =
      new TypeReference<>() {
      };

  private final BoardRepository boardRepository;

  private final BoardPermissionService boardPermissionService;

  private final WhiteboardRepository whiteboardRepository;

  private final WhiteboardStrokeRepository whiteboardStrokeRepository;

  private final WhiteboardEventPublisher whiteboardEventPublisher;

  private final ActivityLogService activityLogService;

  private final JsonMapper jsonMapper;

  /**
   * ============================================================
   * 기존 단일 화이트보드 API
   * ============================================================
   *
   * 기존 프론트:
   *
   * /boards/{boardId}/whiteboard/strokes
   *
   * 기존 WebSocket:
   *
   * /topic/boards/{boardId}/whiteboard
   *
   * 를 그대로 사용할 수 있도록 유지합니다.
   */

  @Transactional
  public WhiteboardStrokeResponse createStroke(
      User user,
      Long boardId,
      WhiteboardStrokeCreateRequest request
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    validateWhiteboardEditable(whiteboard);

    migrateLegacyStrokes(
        board,
        whiteboard
    );

    return createStrokeInternal(
        board,
        whiteboard,
        user,
        request,
        null
    );
  }

  @Transactional
  public List<WhiteboardStrokeResponse> getStrokes(
      User user,
      Long boardId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateReadPermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    migrateLegacyStrokes(
        board,
        whiteboard
    );

    return getStrokeResponses(
        whiteboard
    );
  }

  @Transactional
  public void deleteStroke(
      User user,
      Long boardId,
      Long strokeId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard defaultWhiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    validateWhiteboardEditable(defaultWhiteboard);

    migrateLegacyStrokes(
        board,
        defaultWhiteboard
    );

    WhiteboardStroke stroke =
        whiteboardStrokeRepository
            .findById(
                strokeId
            )
            .orElseThrow(
                () ->
                    new CustomException(
                        ErrorCode.WHITEBOARD_STROKE_NOT_FOUND
                    )
            );

    if (
        !stroke
            .getBoard()
            .getId()
            .equals(
                board.getId()
            )
    ) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_STROKE_NOT_FOUND
      );
    }

    whiteboardStrokeRepository
        .delete(
            stroke
        );

    /*
     * 기존 API 호출이므로
     * 기존 board 단위 WebSocket 채널로 보냅니다.
     */
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.strokeDeleted(
            board.getId(),
            strokeId
        )
    );
  }

  @Transactional
  public void clearWhiteboard(
      User user,
      Long boardId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard whiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    validateWhiteboardEditable(whiteboard);

    migrateLegacyStrokes(
        board,
        whiteboard
    );

    whiteboardStrokeRepository
        .deleteByWhiteboard(
            whiteboard
        );

    activityLogService
        .recordActivity(
            board,
            user,
            ActivityType.WHITEBOARD_CLEARED,
            whiteboard.getId(),
            whiteboard.getTitle(),
            user.getNickname()
                + "님이 '"
                + whiteboard.getTitle()
                + "' 화이트보드를 전체 삭제했습니다."
        );

    /*
     * 기존 API 호출이므로
     * 기존 board 단위 WebSocket 채널로 보냅니다.
     */
    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.cleared(
            board.getId()
        )
    );
  }

  /**
   * ============================================================
   * 신규 다중 화이트보드 API
   * ============================================================
   *
   * REST:
   *
   * /boards/{boardId}/whiteboards/{whiteboardId}/strokes
   *
   * WebSocket:
   *
   * /topic/boards/{boardId}/whiteboards/{whiteboardId}
   */

  @Transactional
  public WhiteboardStrokeResponse createStroke(
      User user,
      Long boardId,
      Long whiteboardId,
      WhiteboardStrokeCreateRequest request
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard defaultWhiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    /*
     * 과거 Stroke는 기본 화이트보드에만 이전합니다.
     */
    migrateLegacyStrokes(
        board,
        defaultWhiteboard
    );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    validateWhiteboardEditable(whiteboard);

    return createStrokeInternal(
        board,
        whiteboard,
        user,
        request,
        whiteboard.getId()
    );
  }

  @Transactional
  public List<WhiteboardStrokeResponse> getStrokes(
      User user,
      Long boardId,
      Long whiteboardId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateReadPermission(
            board,
            user
        );

    Whiteboard defaultWhiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    migrateLegacyStrokes(
        board,
        defaultWhiteboard
    );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    return getStrokeResponses(
        whiteboard
    );
  }

  @Transactional
  public void deleteStroke(
      User user,
      Long boardId,
      Long whiteboardId,
      Long strokeId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard defaultWhiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    migrateLegacyStrokes(
        board,
        defaultWhiteboard
    );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    validateWhiteboardEditable(whiteboard);

    WhiteboardStroke stroke =
        whiteboardStrokeRepository
            .findByIdAndWhiteboard(
                strokeId,
                whiteboard
            )
            .orElseThrow(
                () ->
                    new CustomException(
                        ErrorCode.WHITEBOARD_STROKE_NOT_FOUND
                    )
            );

    whiteboardStrokeRepository
        .delete(
            stroke
        );

    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.strokeDeleted(
            board.getId(),
            whiteboard.getId(),
            strokeId
        )
    );
  }

  @Transactional
  public void clearWhiteboard(
      User user,
      Long boardId,
      Long whiteboardId
  ) {
    Board board =
        getBoardById(
            boardId
        );

    boardPermissionService
        .validateWritePermission(
            board,
            user
        );

    Whiteboard defaultWhiteboard =
        getOrCreateDefaultWhiteboard(
            board
        );

    migrateLegacyStrokes(
        board,
        defaultWhiteboard
    );

    Whiteboard whiteboard =
        getWhiteboardInBoard(
            board,
            whiteboardId
        );

    validateWhiteboardEditable(whiteboard);

    whiteboardStrokeRepository
        .deleteByWhiteboard(
            whiteboard
        );

    activityLogService
        .recordActivity(
            board,
            user,
            ActivityType.WHITEBOARD_CLEARED,
            whiteboard.getId(),
            whiteboard.getTitle(),
            user.getNickname()
                + "님이 '"
                + whiteboard.getTitle()
                + "' 화이트보드를 전체 삭제했습니다."
        );

    whiteboardEventPublisher.publish(
        WhiteboardWebSocketEvent.cleared(
            board.getId(),
            whiteboard.getId()
        )
    );
  }

  /**
   * 실제 Stroke 저장 공통 로직입니다.
   *
   * eventWhiteboardId == null
   * → 기존 단일 화이트보드 WebSocket 채널
   *
   * eventWhiteboardId != null
   * → 신규 whiteboardId별 WebSocket 채널
   */
  private WhiteboardStrokeResponse createStrokeInternal(
      Board board,
      Whiteboard whiteboard,
      User user,
      WhiteboardStrokeCreateRequest request,
      Long eventWhiteboardId
  ) {
    /*
     * 현재 DB에는 기존
     *
     * board_id + client_stroke_id
     *
     * unique constraint가 남아 있으므로
     * 마이그레이션 중에는 board 단위 중복 검사도 유지합니다.
     */
    boolean alreadyExists =
        whiteboardStrokeRepository
            .existsByBoardAndClientStrokeId(
                board,
                request.clientStrokeId()
            );

    if (
        alreadyExists
    ) {
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
            whiteboard,
            user,
            request.clientStrokeId(),
            request.tool(),
            request.color(),
            request.lineWidth(),
            pointsJson
        );

    WhiteboardStroke savedStroke =
        whiteboardStrokeRepository
            .save(
                whiteboardStroke
            );

    WhiteboardStrokeResponse response =
        WhiteboardStrokeResponse.from(
            savedStroke,
            request.points()
        );

    activityLogService
        .recordWhiteboardActivityIfNeeded(
            board,
            user,
            savedStroke.getId()
        );

    if (
        eventWhiteboardId == null
    ) {
      whiteboardEventPublisher.publish(
          WhiteboardWebSocketEvent.strokeCreated(
              board.getId(),
              response
          )
      );
    } else {
      whiteboardEventPublisher.publish(
          WhiteboardWebSocketEvent.strokeCreated(
              board.getId(),
              eventWhiteboardId,
              response
          )
      );
    }

    return response;
  }

  private List<WhiteboardStrokeResponse> getStrokeResponses(
      Whiteboard whiteboard
  ) {
    return whiteboardStrokeRepository
        .findByWhiteboardOrderByIdAsc(
            whiteboard
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
   * 기존 단일 화이트보드 Stroke를
   * 기본 Whiteboard workspace로 자동 이전합니다.
   *
   * 별도의 수동 SQL 없이 기존 그림을 보존합니다.
   */
  private void migrateLegacyStrokes(
      Board board,
      Whiteboard defaultWhiteboard
  ) {
    List<WhiteboardStroke> legacyStrokes =
        whiteboardStrokeRepository
            .findByBoardAndWhiteboardIsNullOrderByIdAsc(
                board
            );

    for (
        WhiteboardStroke stroke :
        legacyStrokes
    ) {
      stroke.assignWhiteboard(
          defaultWhiteboard
      );
    }
  }

  /**
   * 기존 보드에 Whiteboard workspace가 없다면
   * 기본 화이트보드를 자동 생성합니다.
   */
  private void validateWhiteboardEditable(Whiteboard whiteboard) {
    if (whiteboard.isLocked()) {
      throw new CustomException(ErrorCode.WHITEBOARD_LOCKED);
    }
  }

  private Whiteboard getOrCreateDefaultWhiteboard(
      Board board
  ) {
    return whiteboardRepository
        .findByBoardAndDefaultWhiteboardTrue(
            board
        )
        .orElseGet(
            () -> {
              List<Whiteboard> whiteboards =
                  whiteboardRepository
                      .findByBoardOrderByPositionAsc(
                          board
                      );

              if (
                  !whiteboards.isEmpty()
              ) {
                Whiteboard first =
                    whiteboards.get(0);

                first.updateDefaultWhiteboard(
                    true
                );

                return first;
              }

              Whiteboard created =
                  new Whiteboard(
                      board,
                      DEFAULT_WHITEBOARD_TITLE,
                      null,
                      0,
                      true
                  );

              return whiteboardRepository
                  .save(
                      created
                  );
            }
        );
  }

  /**
   * whiteboardId가 진짜 현재 board 소속인지까지 확인합니다.
   */
  private Whiteboard getWhiteboardInBoard(
      Board board,
      Long whiteboardId
  ) {
    return whiteboardRepository
        .findByIdAndBoard(
            whiteboardId,
            board
        )
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.WHITEBOARD_NOT_FOUND
                )
        );
  }

  private Board getBoardById(
      Long boardId
  ) {
    return boardRepository
        .findById(
            boardId
        )
        .orElseThrow(
            () ->
                new CustomException(
                    ErrorCode.BOARD_NOT_FOUND
                )
        );
  }

  private String convertPointsToJson(
      List<WhiteboardPoint> points
  ) {
    try {
      return jsonMapper.writeValueAsString(
          points
      );

    } catch (
        JacksonException exception
    ) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }

  private List<WhiteboardPoint> convertJsonToPoints(
      String pointsJson
  ) {
    try {
      return jsonMapper.readValue(
          pointsJson,
          WHITEBOARD_POINT_LIST_TYPE
      );

    } catch (
        JacksonException exception
    ) {
      throw new CustomException(
          ErrorCode.WHITEBOARD_DATA_PROCESSING_FAILED
      );
    }
  }
}