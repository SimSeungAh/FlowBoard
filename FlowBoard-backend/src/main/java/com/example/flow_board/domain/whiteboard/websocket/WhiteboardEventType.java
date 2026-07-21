package com.example.flow_board.domain.whiteboard.websocket;

public enum WhiteboardEventType {

  /**
   * 새로운 선이 저장된 경우
   * PEN과 ERASER 모두 하나의 선 데이터로 저장되므로 같은 이벤트를 사용
   */
  STROKE_CREATED,

  /**
   * 화이트보드의 모든 선이 삭제된 경우
   */
  CLEARED
}