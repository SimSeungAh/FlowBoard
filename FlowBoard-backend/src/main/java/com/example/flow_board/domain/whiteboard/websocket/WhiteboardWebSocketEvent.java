package com.example.flow_board.domain.whiteboard.websocket;

import com.example.flow_board.domain.whiteboard.dto.WhiteboardPoint;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardObjectResponse;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardResponse;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardStrokeResponse;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardTool;

import java.time.LocalDateTime;
import java.util.List;

public record WhiteboardWebSocketEvent(
    WhiteboardEventType type,
    Long boardId,
    Long whiteboardId,
    Long strokeId,
    WhiteboardStrokeResponse stroke,
    Long objectId,
    WhiteboardObjectResponse object,
    WhiteboardResponse workspace,
    LiveObjectPayload liveObject,
    LiveStrokePayload liveStroke,
    CursorPayload cursor,
    LocalDateTime occurredAt
) {

  public record LiveObjectPayload(
      Long objectId,
      String sourceClientId,
      Long sequence,
      String content,
      Double x,
      Double y,
      Double width,
      Double height
  ) {
  }

  public record LiveStrokePayload(
      String liveStrokeId,
      String sourceClientId,
      Long sequence,
      WhiteboardTool tool,
      String color,
      Integer lineWidth,
      List<WhiteboardPoint> points
  ) {
  }

  public record CursorPayload(
      String sourceClientId,
      Long userId,
      String nickname,
      Double x,
      Double y
  ) {
  }

  public static WhiteboardWebSocketEvent strokeCreated(
      Long boardId,
      WhiteboardStrokeResponse stroke
  ) {
    return base(
        WhiteboardEventType.STROKE_CREATED,
        boardId,
        null,
        stroke.id(),
        stroke,
        null,
        null,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent strokeDeleted(Long boardId, Long strokeId) {
    return base(
        WhiteboardEventType.STROKE_DELETED,
        boardId,
        null,
        strokeId,
        null,
        null,
        null,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent cleared(Long boardId) {
    return base(
        WhiteboardEventType.CLEARED,
        boardId,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent strokeCreated(
      Long boardId,
      Long whiteboardId,
      WhiteboardStrokeResponse stroke
  ) {
    return base(
        WhiteboardEventType.STROKE_CREATED,
        boardId,
        whiteboardId,
        stroke.id(),
        stroke,
        null,
        null,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent strokeDeleted(
      Long boardId,
      Long whiteboardId,
      Long strokeId
  ) {
    return base(
        WhiteboardEventType.STROKE_DELETED,
        boardId,
        whiteboardId,
        strokeId,
        null,
        null,
        null,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent cleared(Long boardId, Long whiteboardId) {
    return base(
        WhiteboardEventType.CLEARED,
        boardId,
        whiteboardId,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent objectCreated(
      Long boardId,
      Long whiteboardId,
      WhiteboardObjectResponse object
  ) {
    return base(
        WhiteboardEventType.OBJECT_CREATED,
        boardId,
        whiteboardId,
        null,
        null,
        object.id(),
        object,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent objectUpdated(
      Long boardId,
      Long whiteboardId,
      WhiteboardObjectResponse object
  ) {
    return base(
        WhiteboardEventType.OBJECT_UPDATED,
        boardId,
        whiteboardId,
        null,
        null,
        object.id(),
        object,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent objectDeleted(
      Long boardId,
      Long whiteboardId,
      Long objectId
  ) {
    return base(
        WhiteboardEventType.OBJECT_DELETED,
        boardId,
        whiteboardId,
        null,
        null,
        objectId,
        null,
        null,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent workspaceUpdated(
      Long boardId,
      Long whiteboardId,
      WhiteboardResponse workspace
  ) {
    return base(
        WhiteboardEventType.WORKSPACE_UPDATED,
        boardId,
        whiteboardId,
        null,
        null,
        null,
        null,
        workspace,
        null,
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent objectLiveEdit(
      Long boardId,
      Long whiteboardId,
      Long objectId,
      String sourceClientId,
      Long sequence,
      String content
  ) {
    return base(
        WhiteboardEventType.OBJECT_LIVE_EDIT,
        boardId,
        whiteboardId,
        null,
        null,
        objectId,
        null,
        null,
        new LiveObjectPayload(objectId, sourceClientId, sequence, content, null, null, null, null),
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent objectLiveMove(
      Long boardId,
      Long whiteboardId,
      Long objectId,
      String sourceClientId,
      Long sequence,
      Double x,
      Double y
  ) {
    return base(
        WhiteboardEventType.OBJECT_LIVE_MOVE,
        boardId,
        whiteboardId,
        null,
        null,
        objectId,
        null,
        null,
        new LiveObjectPayload(objectId, sourceClientId, sequence, null, x, y, null, null),
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent objectLiveResize(
      Long boardId,
      Long whiteboardId,
      Long objectId,
      String sourceClientId,
      Long sequence,
      Double width,
      Double height
  ) {
    return base(
        WhiteboardEventType.OBJECT_LIVE_RESIZE,
        boardId,
        whiteboardId,
        null,
        null,
        objectId,
        null,
        null,
        new LiveObjectPayload(objectId, sourceClientId, sequence, null, null, null, width, height),
        null,
        null
    );
  }

  public static WhiteboardWebSocketEvent strokeLiveStart(
      Long boardId,
      Long whiteboardId,
      String liveStrokeId,
      String sourceClientId,
      Long sequence,
      WhiteboardTool tool,
      String color,
      Integer lineWidth,
      List<WhiteboardPoint> points
  ) {
    return base(
        WhiteboardEventType.STROKE_LIVE_START,
        boardId,
        whiteboardId,
        null,
        null,
        null,
        null,
        null,
        null,
        new LiveStrokePayload(
            liveStrokeId,
            sourceClientId,
            sequence,
            tool,
            color,
            lineWidth,
            points
        ),
        null
    );
  }

  public static WhiteboardWebSocketEvent strokeLiveAppend(
      Long boardId,
      Long whiteboardId,
      String liveStrokeId,
      String sourceClientId,
      Long sequence,
      List<WhiteboardPoint> points
  ) {
    return base(
        WhiteboardEventType.STROKE_LIVE_APPEND,
        boardId,
        whiteboardId,
        null,
        null,
        null,
        null,
        null,
        null,
        new LiveStrokePayload(
            liveStrokeId,
            sourceClientId,
            sequence,
            null,
            null,
            null,
            points
        ),
        null
    );
  }

  public static WhiteboardWebSocketEvent strokeLiveEnd(
      Long boardId,
      Long whiteboardId,
      String liveStrokeId,
      String sourceClientId,
      Long sequence
  ) {
    return base(
        WhiteboardEventType.STROKE_LIVE_END,
        boardId,
        whiteboardId,
        null,
        null,
        null,
        null,
        null,
        null,
        new LiveStrokePayload(
            liveStrokeId,
            sourceClientId,
            sequence,
            null,
            null,
            null,
            List.of()
        ),
        null
    );
  }

  public static WhiteboardWebSocketEvent cursorMoved(
      Long boardId,
      Long whiteboardId,
      String sourceClientId,
      Long userId,
      String nickname,
      Double x,
      Double y
  ) {
    return base(
        WhiteboardEventType.CURSOR_MOVED,
        boardId,
        whiteboardId,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        new CursorPayload(sourceClientId, userId, nickname, x, y)
    );
  }

  private static WhiteboardWebSocketEvent base(
      WhiteboardEventType type,
      Long boardId,
      Long whiteboardId,
      Long strokeId,
      WhiteboardStrokeResponse stroke,
      Long objectId,
      WhiteboardObjectResponse object,
      WhiteboardResponse workspace,
      LiveObjectPayload liveObject,
      LiveStrokePayload liveStroke,
      CursorPayload cursor
  ) {
    return new WhiteboardWebSocketEvent(
        type,
        boardId,
        whiteboardId,
        strokeId,
        stroke,
        objectId,
        object,
        workspace,
        liveObject,
        liveStroke,
        cursor,
        LocalDateTime.now()
    );
  }
}
