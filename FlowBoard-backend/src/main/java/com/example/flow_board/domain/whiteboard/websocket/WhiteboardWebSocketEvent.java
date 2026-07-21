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
   * 화이트보드 선 생성 이벤트
   * 다른 사용자의 화면에서는 전달받은 stroke를 현재 Canvas에 추가로 그리게 됨
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
   * 화이트보드 전체 삭제 이벤트
   * 전체 삭제 이벤트에는 특정 선 데이터가 없으므로 strokeId와 stroke는 null로 전달
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