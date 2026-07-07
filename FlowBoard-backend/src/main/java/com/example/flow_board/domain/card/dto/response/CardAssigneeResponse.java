package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.CardAssignee;

import java.time.LocalDateTime;

public record CardAssigneeResponse(
    Long id,
    Long cardId,
    Long userId,
    String email,
    String nickname,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static CardAssigneeResponse from(CardAssignee cardAssignee) {
    return new CardAssigneeResponse(
        cardAssignee.getId(),
        cardAssignee.getCard().getId(),
        cardAssignee.getUser().getId(),
        cardAssignee.getUser().getEmail(),
        cardAssignee.getUser().getNickname(),
        cardAssignee.getCreatedAt(),
        cardAssignee.getUpdatedAt()
    );
  }
}