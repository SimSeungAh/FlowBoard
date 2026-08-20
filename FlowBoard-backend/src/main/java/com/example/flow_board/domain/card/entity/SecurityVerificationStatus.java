package com.example.flow_board.domain.card.entity;

public enum SecurityVerificationStatus {

  /**
   * 아직 검증을 시작하지 않은 상태
   */
  PENDING,

  /**
   * 현재 검증을 진행 중인 상태
   */
  IN_PROGRESS,

  /**
   * 대응 후 다시 검증해야 하는 상태
   */
  RETEST_REQUIRED,

  /**
   * 검증을 완료한 상태
   */
  VERIFIED
}