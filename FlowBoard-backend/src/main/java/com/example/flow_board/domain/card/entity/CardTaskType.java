package com.example.flow_board.domain.card.entity;

public enum CardTaskType {

  /**
   * 일반 작업
   *
   * 기본 작업 / 빈 작업은 GENERAL로 저장합니다.
   */
  GENERAL,

  /**
   * 버그 리포트
   */
  BUG,

  /**
   * 테스트 케이스
   */
  TEST_CASE,

  /**
   * 디자인 리뷰
   */
  DESIGN_REVIEW,

  /**
   * 기획 / 요구사항
   */
  REQUIREMENT,

  /**
   * 보안 점검
   */
  SECURITY_REVIEW,

  /**
   * 릴리즈 체크
   */
  RELEASE_CHECK
}