package com.example.flow_board.domain.board.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BoardMemberRepository extends JpaRepository<BoardMember, Long> {

  List<BoardMember> findByUser(User user);

  List<BoardMember> findByBoard(Board board);

  Optional<BoardMember> findByBoardAndUser(Board board, User user);

  boolean existsByBoardAndUser(Board board, User user);
}