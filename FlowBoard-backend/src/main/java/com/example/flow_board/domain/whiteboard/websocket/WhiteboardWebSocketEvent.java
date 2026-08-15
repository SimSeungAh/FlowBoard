package com.example.flow_board.domain.whiteboard.websocket;

import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardStrokeResponse;

import java.time.LocalDateTime;

public record WhiteboardWebSocketEvent(

    WhiteboardEventType type,

    Long boardId,

    Long strokeId,

    WhiteboardStrokeResponse stroke,

    LocalDateTime occurredAt

) {

  /**
   * 새로운 선 생성 이벤트
   */
  public static WhiteboardWebSocketEvent strokeCreated(
      Long boardId,
      WhiteboardStrokeResponse stroke
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.STROKE_CREATED,
        boardId,
        stroke.id(),
        stroke,
        LocalDateTime.now()
    );
  }

  /**
   * 개별 선 삭제 이벤트
   *
   * 삭제된 선 자체의 전체 데이터는 필요하지 않고
   * strokeId만 전달합니다.
   */
  public static WhiteboardWebSocketEvent strokeDeleted(
      Long boardId,
      Long strokeId
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.STROKE_DELETED,
        boardId,
        strokeId,
        null,
        LocalDateTime.now()
    );
  }

  /**
   * 화이트보드 전체 삭제 이벤트
   */
  public static WhiteboardWebSocketEvent cleared(
      Long boardId
  ) {
    return new WhiteboardWebSocketEvent(
        WhiteboardEventType.CLEARED,
        boardId,
        null,
        null,
        LocalDateTime.now()
    );
  }
}