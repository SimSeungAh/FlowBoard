package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Tag;

import java.time.LocalDateTime;

public record TagResponse(
    Long id,
    Long boardId,
    String name,
    String color,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static TagResponse from(Tag tag) {
    return new TagResponse(
        tag.getId(),
        tag.getBoard().getId(),
        tag.getName(),
        tag.getColor(),
        tag.getCreatedAt(),
        tag.getUpdatedAt()
    );
  }
}