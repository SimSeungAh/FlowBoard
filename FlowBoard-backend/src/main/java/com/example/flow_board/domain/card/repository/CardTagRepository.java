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
   * 특정 카드에 연결된 태그를 등록 순서대로 조회
   */
  List<CardTag> findByCardOrderByCreatedAtAsc(
      Card card
  );

  /**
   * 특정 태그가 연결된 카드 정보를 조회
   */
  List<CardTag> findByTag(
      Tag tag
  );

  /**
   * 특정 카드와 태그의 연결 정보를 조회
   */
  Optional<CardTag> findByCardAndTag(
      Card card,
      Tag tag
  );

  /**
   * 특정 태그가 카드에 이미 연결되어 있는지 확인.
   */
  boolean existsByCardAndTag(
      Card card,
      Tag tag
  );

  /**
   * 여러 카드에 연결된 태그를 한 번에 조회
   * 태그 응답을 만들 때 Tag 정보가 필요하므로 fetch join으로 Tag까지 함께 조회
   */
  @Query("""
      select cardTag
      from CardTag cardTag
      join fetch cardTag.tag
      where cardTag.card.id in :cardIds
      order by cardTag.card.id asc,
               cardTag.createdAt asc
      """)
  List<CardTag> findAllByCardIdsWithTag(
      @Param("cardIds") List<Long> cardIds
  );
}