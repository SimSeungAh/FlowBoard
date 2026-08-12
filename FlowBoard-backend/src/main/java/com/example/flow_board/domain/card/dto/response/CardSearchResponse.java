package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Card;

import java.time.LocalDateTime;
import java.util.List;

public record CardSearchResponse(

    Long id,

    Long columnId,

    Long createdById,

    String createdByNickname,

    String title,

    String description,

    String rank,

    LocalDateTime dueDate,

    List<CardAssigneeResponse> assignees,

    List<TagResponse> tags,

    LocalDateTime createdAt,

    LocalDateTime updatedAt

) {

  public static CardSearchResponse from(
      Card card,
      List<CardAssigneeResponse> assignees,
      List<TagResponse> tags
  ) {
    return new CardSearchResponse(
        card.getId(),
        card.getBoardColumn().getId(),
        card.getCreatedBy().getId(),
        card.getCreatedBy().getNickname(),
        card.getTitle(),
        card.getDescription(),
        card.getRank(),
        card.getDueDate(),
        List.copyOf(assignees),
        List.copyOf(tags),
        card.getCreatedAt(),
        card.getUpdatedAt()
    );
  }
}