package com.example.flow_board.domain.card.entity;

public enum TestCaseResult {

  /**
   * 아직 테스트하지 않은 상태입니다.
   */
  NOT_RUN,

  /**
   * 테스트 성공
   */
  PASS,

  /**
   * 테스트 실패
   */
  FAIL,

  /**
   * 다른 문제나 선행 조건 때문에
   * 테스트를 진행할 수 없는 상태입니다.
   */
  BLOCKED
}