package com.example.flow_board.domain.card.dto.request;

/**
 * 보드 내 카드 검색 및 필터 조건
 * 모든 값은 선택 사항이며, 값이 null이면 해당 조건은 적용하지 않음
 */
public record CardSearchCondition(

    /**
     * 카드 제목 또는 설명에서 검색할 키워드
     */
    String keyword,

    /**
     * 특정 담당자가 지정된 카드만 조회할 때 사용
     */
    Long assigneeId,

    /**
     * 특정 태그가 연결된 카드만 조회할 때 사용
     */
    Long tagId,

    /**
     * 카드 마감일 조건
     */
    CardDueDateFilter dueDateFilter
) {

  /**
   * 공백만 입력된 검색어는 검색 조건이 없는 것으로 처리
   */
  public String normalizedKeyword() {
    if (keyword == null) {
      return null;
    }

    String trimmedKeyword = keyword.trim();

    return trimmedKeyword.isEmpty()
        ? null
        : trimmedKeyword;
  }
}