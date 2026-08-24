package com.example.flow_board.domain.whiteboard.entity;

/**
 * 화이트보드에서 Stroke가 아닌
 * 편집 가능한 객체의 종류입니다.
 *
 * PEN / ERASER는 기존 WhiteboardStroke에서
 * 계속 관리합니다.
 */
public enum WhiteboardObjectType {

  /**
   * 포스트잇 / 스티키 노트
   */
  STICKY_NOTE,

  /**
   * 독립 텍스트
   */
  TEXT,

  /**
   * 사각형
   */
  RECTANGLE,

  /**
   * 원 / 타원
   */
  ELLIPSE,

  /**
   * 화살표 / 연결선
   */
  ARROW
}