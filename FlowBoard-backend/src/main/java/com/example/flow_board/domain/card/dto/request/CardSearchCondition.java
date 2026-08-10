package com.example.flow_board.domain.card.dto.request;

public record CardSearchCondition(

        String keyword,

        Long assigneeId,

        Long tagId,

        CardDueDateFilter dueDateFilter

) {

  /**
   * 검색어 앞뒤 공백을 제거합니다.
   *
   * 빈 문자열은 검색 조건으로 사용하지 않습니다.
   */
  public String normalizedKeyword() {
    if (keyword == null) {
      return null;
    }

    String normalized =
            keyword.trim();

    return normalized.isEmpty()
            ? null
            : normalized;
  }
}