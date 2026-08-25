package com.example.flow_board.domain.whiteboard.websocket;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.whiteboard.dto.WhiteboardPoint;
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardObject;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardTool;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardObjectRepository;
import com.example.flow_board.domain.whiteboard.repository.WhiteboardRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import com.example.flow_board.global.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.List;

@Controller
@RequiredArgsConstructor
public class WhiteboardLiveMessageController {

  private static final int MAX_CLIENT_ID_LENGTH = 64;
  private static final int MAX_LIVE_STROKE_ID_LENGTH = 64;
  private static final int MAX_CONTENT_LENGTH = 10_000;
  private static final int MAX_LIVE_POINT_BATCH = 64;
  private static final int MAX_LINE_WIDTH = 100;
  private static final int MAX_COLOR_LENGTH = 30;
  private static final double MAX_CANVAS_COORDINATE = 100_000;

  private final SimpMessagingTemplate messagingTemplate;
  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;
  private final WhiteboardRepository whiteboardRepository;
  private final WhiteboardObjectRepository whiteboardObjectRepository;

  @MessageMapping("/boards/{boardId}/whiteboards/{whiteboardId}/objects/{objectId}/live-edit")
  public void liveEdit(
      @DestinationVariable Long boardId,
      @DestinationVariable Long whiteboardId,
      @DestinationVariable Long objectId,
      @Payload LiveEditRequest request,
      Principal principal
  ) {
    User user = getUser(principal);
    Whiteboard whiteboard = validateWrite(boardId, whiteboardId, user);
    validateObjectEditable(whiteboard, objectId);
    validateCommonRequest(request.sourceClientId(), request.sequence());

    if (request.content() == null || request.content().length() > MAX_CONTENT_LENGTH) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    messagingTemplate.convertAndSend(
        buildTopic(boardId, whiteboardId),
        WhiteboardWebSocketEvent.objectLiveEdit(
            boardId,
            whiteboardId,
            objectId,
            request.sourceClientId(),
            request.sequence(),
            request.content()
        )
    );
  }

  @MessageMapping("/boards/{boardId}/whiteboards/{whiteboardId}/objects/{objectId}/live-move")
  public void liveMove(
      @DestinationVariable Long boardId,
      @DestinationVariable Long whiteboardId,
      @DestinationVariable Long objectId,
      @Payload LiveMoveRequest request,
      Principal principal
  ) {
    User user = getUser(principal);
    Whiteboard whiteboard = validateWrite(boardId, whiteboardId, user);
    validateObjectEditable(whiteboard, objectId);
    validateCommonRequest(request.sourceClientId(), request.sequence());
    validateCoordinate(request.x(), request.y());

    messagingTemplate.convertAndSend(
        buildTopic(boardId, whiteboardId),
        WhiteboardWebSocketEvent.objectLiveMove(
            boardId,
            whiteboardId,
            objectId,
            request.sourceClientId(),
            request.sequence(),
            request.x(),
            request.y()
        )
    );
  }

  @MessageMapping("/boards/{boardId}/whiteboards/{whiteboardId}/objects/{objectId}/live-resize")
  public void liveResize(
      @DestinationVariable Long boardId,
      @DestinationVariable Long whiteboardId,
      @DestinationVariable Long objectId,
      @Payload LiveResizeRequest request,
      Principal principal
  ) {
    User user = getUser(principal);
    Whiteboard whiteboard = validateWrite(boardId, whiteboardId, user);
    validateObjectEditable(whiteboard, objectId);
    validateCommonRequest(request.sourceClientId(), request.sequence());

    if (
        request.width() == null
            || request.height() == null
            || !Double.isFinite(request.width())
            || !Double.isFinite(request.height())
            || request.width() < 20
            || request.height() < 20
            || request.width() > MAX_CANVAS_COORDINATE
            || request.height() > MAX_CANVAS_COORDINATE
    ) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    messagingTemplate.convertAndSend(
        buildTopic(boardId, whiteboardId),
        WhiteboardWebSocketEvent.objectLiveResize(
            boardId,
            whiteboardId,
            objectId,
            request.sourceClientId(),
            request.sequence(),
            request.width(),
            request.height()
        )
    );
  }

  @MessageMapping("/boards/{boardId}/whiteboards/{whiteboardId}/strokes/live-start")
  public void liveStrokeStart(
      @DestinationVariable Long boardId,
      @DestinationVariable Long whiteboardId,
      @Payload LiveStrokeStartRequest request,
      Principal principal
  ) {
    User user = getUser(principal);
    validateWrite(boardId, whiteboardId, user);
    validateCommonRequest(request.sourceClientId(), request.sequence());
    validateLiveStrokeId(request.liveStrokeId());

    if (
        request.tool() == null
            || request.color() == null
            || request.color().isBlank()
            || request.color().length() > MAX_COLOR_LENGTH
            || request.lineWidth() == null
            || request.lineWidth() <= 0
            || request.lineWidth() > MAX_LINE_WIDTH
    ) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    validatePoints(request.points(), true);

    messagingTemplate.convertAndSend(
        buildTopic(boardId, whiteboardId),
        WhiteboardWebSocketEvent.strokeLiveStart(
            boardId,
            whiteboardId,
            request.liveStrokeId(),
            request.sourceClientId(),
            request.sequence(),
            request.tool(),
            request.color(),
            request.lineWidth(),
            request.points()
        )
    );
  }

  @MessageMapping("/boards/{boardId}/whiteboards/{whiteboardId}/strokes/live-append")
  public void liveStrokeAppend(
      @DestinationVariable Long boardId,
      @DestinationVariable Long whiteboardId,
      @Payload LiveStrokeAppendRequest request,
      Principal principal
  ) {
    User user = getUser(principal);
    validateWrite(boardId, whiteboardId, user);
    validateCommonRequest(request.sourceClientId(), request.sequence());
    validateLiveStrokeId(request.liveStrokeId());
    validatePoints(request.points(), true);

    messagingTemplate.convertAndSend(
        buildTopic(boardId, whiteboardId),
        WhiteboardWebSocketEvent.strokeLiveAppend(
            boardId,
            whiteboardId,
            request.liveStrokeId(),
            request.sourceClientId(),
            request.sequence(),
            request.points()
        )
    );
  }

  @MessageMapping("/boards/{boardId}/whiteboards/{whiteboardId}/strokes/live-end")
  public void liveStrokeEnd(
      @DestinationVariable Long boardId,
      @DestinationVariable Long whiteboardId,
      @Payload LiveStrokeEndRequest request,
      Principal principal
  ) {
    User user = getUser(principal);
    validateWrite(boardId, whiteboardId, user);
    validateCommonRequest(request.sourceClientId(), request.sequence());
    validateLiveStrokeId(request.liveStrokeId());

    messagingTemplate.convertAndSend(
        buildTopic(boardId, whiteboardId),
        WhiteboardWebSocketEvent.strokeLiveEnd(
            boardId,
            whiteboardId,
            request.liveStrokeId(),
            request.sourceClientId(),
            request.sequence()
        )
    );
  }

  /**
   * 실시간 커서는 VIEWER도 전송할 수 있습니다.
   * 좌표는 저장하지 않고 같은 화이트보드의 구독자에게만 전달합니다.
   */
  @MessageMapping("/boards/{boardId}/whiteboards/{whiteboardId}/cursor")
  public void cursorMoved(
      @DestinationVariable Long boardId,
      @DestinationVariable Long whiteboardId,
      @Payload CursorRequest request,
      Principal principal
  ) {
    User user = getUser(principal);
    validateRead(boardId, whiteboardId, user);
    validateClientId(request.sourceClientId());
    validateCoordinate(request.x(), request.y());

    messagingTemplate.convertAndSend(
        buildTopic(boardId, whiteboardId),
        WhiteboardWebSocketEvent.cursorMoved(
            boardId,
            whiteboardId,
            request.sourceClientId(),
            user.getId(),
            user.getNickname(),
            request.x(),
            request.y()
        )
    );
  }

  private Whiteboard validateWrite(Long boardId, Long whiteboardId, User user) {
    Board board = getBoard(boardId);
    boardPermissionService.validateWritePermission(board, user);
    Whiteboard whiteboard = getWhiteboard(board, whiteboardId);

    if (whiteboard.isLocked()) {
      throw new CustomException(ErrorCode.WHITEBOARD_LOCKED);
    }

    return whiteboard;
  }

  private Whiteboard validateRead(Long boardId, Long whiteboardId, User user) {
    Board board = getBoard(boardId);
    boardPermissionService.validateReadPermission(board, user);
    return getWhiteboard(board, whiteboardId);
  }

  private void validateObjectEditable(Whiteboard whiteboard, Long objectId) {
    WhiteboardObject object = whiteboardObjectRepository
        .findByIdAndWhiteboard(objectId, whiteboard)
        .orElseThrow(() -> new CustomException(ErrorCode.INVALID_INPUT));

    if (object.isLocked()) {
      throw new CustomException(ErrorCode.WHITEBOARD_OBJECT_LOCKED);
    }
  }

  private Board getBoard(Long boardId) {
    return boardRepository
        .findById(boardId)
        .orElseThrow(() -> new CustomException(ErrorCode.BOARD_NOT_FOUND));
  }

  private Whiteboard getWhiteboard(Board board, Long whiteboardId) {
    return whiteboardRepository
        .findByIdAndBoard(whiteboardId, board)
        .orElseThrow(() -> new CustomException(ErrorCode.WHITEBOARD_NOT_FOUND));
  }

  private User getUser(Principal principal) {
    if (!(principal instanceof Authentication authentication)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    if (!(authentication.getPrincipal() instanceof CustomUserDetails userDetails)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED);
    }

    return userDetails.getUser();
  }

  private void validateCommonRequest(String sourceClientId, Long sequence) {
    validateClientId(sourceClientId);

    if (sequence == null || sequence < 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private void validateClientId(String sourceClientId) {
    if (
        sourceClientId == null
            || sourceClientId.isBlank()
            || sourceClientId.length() > MAX_CLIENT_ID_LENGTH
    ) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private void validateLiveStrokeId(String liveStrokeId) {
    if (
        liveStrokeId == null
            || liveStrokeId.isBlank()
            || liveStrokeId.length() > MAX_LIVE_STROKE_ID_LENGTH
    ) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private void validatePoints(List<WhiteboardPoint> points, boolean requireAtLeastOne) {
    if (
        points == null
            || (requireAtLeastOne && points.isEmpty())
            || points.size() > MAX_LIVE_POINT_BATCH
    ) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    for (WhiteboardPoint point : points) {
      if (point == null) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
      validateCoordinate(point.x(), point.y());
    }
  }

  private void validateCoordinate(Double x, Double y) {
    if (
        x == null
            || y == null
            || !Double.isFinite(x)
            || !Double.isFinite(y)
            || x < 0
            || y < 0
            || x > MAX_CANVAS_COORDINATE
            || y > MAX_CANVAS_COORDINATE
    ) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }
  }

  private String buildTopic(Long boardId, Long whiteboardId) {
    return "/topic/boards/" + boardId + "/whiteboards/" + whiteboardId;
  }

  public record LiveEditRequest(String sourceClientId, Long sequence, String content) {
  }

  public record LiveMoveRequest(String sourceClientId, Long sequence, Double x, Double y) {
  }

  public record LiveResizeRequest(
      String sourceClientId,
      Long sequence,
      Double width,
      Double height
  ) {
  }

  public record LiveStrokeStartRequest(
      String liveStrokeId,
      String sourceClientId,
      Long sequence,
      WhiteboardTool tool,
      String color,
      Integer lineWidth,
      List<WhiteboardPoint> points
  ) {
  }

  public record LiveStrokeAppendRequest(
      String liveStrokeId,
      String sourceClientId,
      Long sequence,
      List<WhiteboardPoint> points
  ) {
  }

  public record LiveStrokeEndRequest(
      String liveStrokeId,
      String sourceClientId,
      Long sequence
  ) {
  }

  public record CursorRequest(
      String sourceClientId,
      Double x,
      Double y
  ) {
  }
}
