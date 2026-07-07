package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Comment;

import java.time.LocalDateTime;

public record CommentResponse(
    Long id,
    Long cardId,
    Long userId,
    String userNickname,
    String content,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static CommentResponse from(Comment comment) {
    return new CommentResponse(
        comment.getId(),
        comment.getCard().getId(),
        comment.getUser().getId(),
        comment.getUser().getNickname(),
        comment.getContent(),
        comment.getCreatedAt(),
        comment.getUpdatedAt()
    );
  }
}