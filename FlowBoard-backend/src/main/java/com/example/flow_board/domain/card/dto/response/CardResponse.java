package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Card;

import java.time.LocalDateTime;

public record CardResponse(
    Long id,
    Long columnId,
    Long createdById,
    String createdByNickname,
    String title,
    String description,
    String rank,
    LocalDateTime dueDate,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static CardResponse from(Card card) {
    return new CardResponse(
        card.getId(),
        card.getBoardColumn().getId(),
        card.getCreatedBy().getId(),
        card.getCreatedBy().getNickname(),
        card.getTitle(),
        card.getDescription(),
        card.getRank(),
        card.getDueDate(),
        card.getCreatedAt(),
        card.getUpdatedAt()
    );
  }
}