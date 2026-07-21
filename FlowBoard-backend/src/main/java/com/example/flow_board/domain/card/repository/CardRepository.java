package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.card.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardRepository
    extends JpaRepository<Card, Long>,
    CardSearchRepository {

  /**
   * 특정 컬럼의 카드를 LexoRank 순서대로 조회
   */
  List<Card> findByBoardColumnOrderByRankAsc(
      BoardColumn boardColumn
  );

  /**
   * 특정 컬럼에 들어 있는 카드 개수를 조회
   */
  long countByBoardColumn(
      BoardColumn boardColumn
  );

  /**
   * 특정 컬럼에서 가장 마지막 LexoRank를 가진 카드를 조회
   */
  Optional<Card> findTopByBoardColumnOrderByRankDesc(
      BoardColumn boardColumn
  );
}