package com.example.flow_board.domain.card.entity;

public enum SecuritySeverity {

  /**
   * 즉시 대응이 필요한 치명적인 보안 이슈
   */
  CRITICAL,

  /**
   * 우선순위를 높게 두고 빠르게 대응해야 하는 이슈
   */
  HIGH,

  /**
   * 일반적인 보안 점검 및 대응이 필요한 이슈
   */
  MEDIUM,

  /**
   * 영향도가 낮지만 기록과 확인이 필요한 이슈
   */
  LOW
}