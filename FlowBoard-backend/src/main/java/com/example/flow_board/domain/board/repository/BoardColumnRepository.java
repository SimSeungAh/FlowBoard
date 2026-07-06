package com.example.flow_board.domain.board.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardColumnRepository extends JpaRepository<BoardColumn, Long> {

  List<BoardColumn> findByBoardOrderByPositionAsc(Board board);
}