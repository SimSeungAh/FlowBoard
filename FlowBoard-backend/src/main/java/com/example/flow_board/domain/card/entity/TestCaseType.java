package com.example.flow_board.domain.card.entity;

public enum TestCaseType {

  /**
   * 정상적인 입력과 흐름을 검증합니다.
   */
  NORMAL,

  /**
   * 오류 입력과 실패 상황을 검증합니다.
   */
  EXCEPTION,

  /**
   * 최소값, 최대값, 빈 값 등 경계 조건을 검증합니다.
   */
  BOUNDARY,

  /**
   * 역할과 접근 권한을 검증합니다.
   */
  PERMISSION,

  /**
   * 인증, 입력 공격 등 보안 조건을 검증합니다.
   */
  SECURITY,

  /**
   * 장애, 재연결, 실패 후 복구를 검증합니다.
   */
  RECOVERY,

  /**
   * 여러 컴포넌트 또는 시스템 간 연동을 검증합니다.
   */
  INTEGRATION,

  /**
   * 실제 사용자 흐름 전체를 검증합니다.
   */
  E2E
}