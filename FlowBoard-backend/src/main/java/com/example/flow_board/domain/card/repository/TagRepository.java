package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.card.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {

  List<Tag> findByBoardOrderByCreatedAtAsc(Board board);

  Optional<Tag> findByBoardAndName(Board board, String name);

  boolean existsByBoardAndName(Board board, String name);
}