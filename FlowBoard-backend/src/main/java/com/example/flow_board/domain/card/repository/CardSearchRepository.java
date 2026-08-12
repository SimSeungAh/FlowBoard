package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.dto.request.CardSearchCondition;
import com.example.flow_board.domain.card.entity.Card;

import java.time.LocalDateTime;
import java.util.List;

public interface CardSearchRepository {

  /**
   * 보드 내 카드 검색 및 필터
   *
   * keyword      : 제목/설명 검색
   * assigneeId   : 담당자 필터
   * tagId        : 태그 필터
   * dueDateFilter: 마감일 필터
   */
  List<Card> searchCards(
      Long boardId,
      CardSearchCondition condition,
      LocalDateTime referenceTime
  );
}