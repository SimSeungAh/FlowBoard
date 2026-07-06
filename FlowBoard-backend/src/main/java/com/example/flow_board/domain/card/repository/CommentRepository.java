package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Comment;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommentRepository extends JpaRepository<Comment, Long> {
}