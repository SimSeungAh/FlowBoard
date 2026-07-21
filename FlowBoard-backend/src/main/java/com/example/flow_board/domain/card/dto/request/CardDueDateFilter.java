package com.example.flow_board.domain.card.dto.request;

/**
 * 카드 마감일 필터
 */
public enum CardDueDateFilter {

  /**
   * 현재 시각을 기준으로 마감일이 지난 카드
   */
  OVERDUE,

  /**
   * 오늘 마감되는 카드
   */
  TODAY,

  /**
   * 현재 시각 이후에 마감되는 카드
   * 오늘 마감되는 카드도 포함
   */
  UPCOMING,

  /**
   * 마감일이 설정되지 않은 카드
   */
  NO_DUE_DATE
}