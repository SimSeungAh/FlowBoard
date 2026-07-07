package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Checklist;

import java.time.LocalDateTime;
import java.util.List;

public record ChecklistResponse(
    Long id,
    Long cardId,
    String title,
    Integer position,
    List<ChecklistItemResponse> items,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static ChecklistResponse from(
      Checklist checklist,
      List<ChecklistItemResponse> items
  ) {
    return new ChecklistResponse(
        checklist.getId(),
        checklist.getCard().getId(),
        checklist.getTitle(),
        checklist.getPosition(),
        items,
        checklist.getCreatedAt(),
        checklist.getUpdatedAt()
    );
  }
}