package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.ChecklistItem;

import java.time.LocalDateTime;

public record ChecklistItemResponse(
    Long id,
    Long checklistId,
    String content,
    boolean checked,
    Integer position,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static ChecklistItemResponse from(ChecklistItem item) {
    return new ChecklistItemResponse(
        item.getId(),
        item.getChecklist().getId(),
        item.getContent(),
        item.isChecked(),
        item.getPosition(),
        item.getCreatedAt(),
        item.getUpdatedAt()
    );
  }
}