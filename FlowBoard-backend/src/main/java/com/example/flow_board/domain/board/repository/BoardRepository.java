package com.example.flow_board.domain.board.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BoardRepository extends JpaRepository<Board, Long> {

  List<Board> findByOwnerOrderByCreatedAtDesc(User owner);
}