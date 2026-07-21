package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.dto.request.CardSearchCondition;
import com.example.flow_board.domain.card.entity.Card;

import java.time.LocalDateTime;
import java.util.List;

public interface CardSearchRepository {

  /**
   * 특정 보드의 카드를 검색 조건에 따라 조회
   *
   * @param boardId       검색할 보드 ID
   * @param condition     키워드, 담당자, 태그, 마감일 조건
   * @param referenceTime 마감일 판단 기준 시각
   * @return 검색 조건을 만족하는 카드 목록
   */
  List<Card> searchCards(
      Long boardId,
      CardSearchCondition condition,
      LocalDateTime referenceTime
  );
}