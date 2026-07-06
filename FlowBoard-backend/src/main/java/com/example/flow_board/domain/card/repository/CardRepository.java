package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.card.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CardRepository extends JpaRepository<Card, Long> {

  List<Card> findByBoardColumnOrderByRankAsc(BoardColumn boardColumn);

  long countByBoardColumn(BoardColumn boardColumn);
}