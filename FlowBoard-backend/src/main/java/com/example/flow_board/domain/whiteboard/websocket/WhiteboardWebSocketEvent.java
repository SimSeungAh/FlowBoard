package com.example.flow_board.domain.whiteboard.websocket;

import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardStrokeResponse;

import java.time.LocalDateTime;

public record WhiteboardWebSocketEvent(

    WhiteboardEventType type,

    Long boardId,

    /**
     * 신규 다중 화이트보드 이벤트에서는 값이 존재합니다.
     *
     * 기존 단일 화이트보드 호환 이벤트에서는 null입니다.
     */
    Long whiteboardId,

    Long strokeId,

    WhiteboardStrokeResponse stroke,

    LocalDateTime occurredAt

) {

  /**
   * ------------------------------------------------------------
   * 기존 단일 화이트보드 호환 이벤트
   * ------------------------------------------------------------
   */

  public static WhiteboardWebSocketEvent strokeCreated(
      Long boardId,
      WhiteboardStrokeResponse stroke
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.STROKE_CREATED,
        boardId,
        null,
        stroke.id(),
        stroke,
        LocalDateTime.now()
    );
  }

  public static WhiteboardWebSocketEvent strokeDeleted(
      Long boardId,
      Long strokeId
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.STROKE_DELETED,
        boardId,
        null,
        strokeId,
        null,
        LocalDateTime.now()
    );
  }

  public static WhiteboardWebSocketEvent cleared(
      Long boardId
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.CLEARED,
        boardId,
        null,
        null,
        null,
        LocalDateTime.now()
    );
  }

  /**
   * ------------------------------------------------------------
   * 신규 다중 화이트보드 이벤트
   * ------------------------------------------------------------
   */

  public static WhiteboardWebSocketEvent strokeCreated(
      Long boardId,
      Long whiteboardId,
      WhiteboardStrokeResponse stroke
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.STROKE_CREATED,
        boardId,
        whiteboardId,
        stroke.id(),
        stroke,
        LocalDateTime.now()
    );
  }

  public static WhiteboardWebSocketEvent strokeDeleted(
      Long boardId,
      Long whiteboardId,
      Long strokeId
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.STROKE_DELETED,
        boardId,
        whiteboardId,
        strokeId,
        null,
        LocalDateTime.now()
    );
  }

  public static WhiteboardWebSocketEvent cleared(
      Long boardId,
      Long whiteboardId
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.CLEARED,
        boardId,
        whiteboardId,
        null,
        null,
        LocalDateTime.now()
    );
  }
}