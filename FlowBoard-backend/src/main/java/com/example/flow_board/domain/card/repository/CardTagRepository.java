package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTag;
import com.example.flow_board.domain.card.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CardTagRepository
    extends JpaRepository<CardTag, Long> {

  /**
   * 카드의 태그 연결 목록 조회
   */
  List<CardTag> findByCardOrderByCreatedAtAsc(
      Card card
  );

  /**
   * 특정 태그가 연결된 모든 CardTag 조회
   *
   * 태그 삭제 시 연결 관계를 먼저 제거하기 위해 사용합니다.
   */
  List<CardTag> findByTag(
      Tag tag
  );

  /**
   * 카드와 태그 연결 조회
   */
  Optional<CardTag> findByCardAndTag(
      Card card,
      Tag tag
  );

  /**
   * 카드에 해당 태그가 이미 연결돼 있는지 확인
   */
  boolean existsByCardAndTag(
      Card card,
      Tag tag
  );

  /**
   * 여러 카드의 태그를 한 번에 조회합니다.
   *
   * tag를 fetch join해서 검색 결과 변환 과정에서
   * 각 태그마다 추가 쿼리가 발생하지 않도록 합니다.
   */
  @Query("""
      select ct
      from CardTag ct
      join fetch ct.tag
      where ct.card.id in :cardIds
      order by ct.card.id asc, ct.createdAt asc
      """)
  List<CardTag> findAllByCardIdsWithTag(
      @Param("cardIds")
      List<Long> cardIds
  );
}