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
   * 특정 컬럼의 카드를 LexoRank 순서로 조회합니다.
   */
  List<Card> findByBoardColumnOrderByRankAsc(
      BoardColumn boardColumn
  );

  /**
   * 특정 컬럼의 카드 개수를 조회합니다.
   */
  long countByBoardColumn(
      BoardColumn boardColumn
  );

  /**
   * 특정 컬럼에서 가장 뒤에 있는 카드를 조회합니다.
   *
   * 새 카드 생성 시 마지막 카드 뒤의
   * LexoRank를 계산하기 위해 사용합니다.
   */
  Optional<Card> findTopByBoardColumnOrderByRankDesc(
      BoardColumn boardColumn
  );
}