package com.example.flow_board.domain.board.dto.response;

import com.example.flow_board.domain.board.entity.Board;

import java.time.LocalDateTime;

public record BoardResponse(
    Long id,
    String title,
    String description,
    String backgroundColor,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static BoardResponse from(Board board) {
    return new BoardResponse(
        board.getId(),
        board.getTitle(),
        board.getDescription(),
        board.getBackgroundColor(),
        board.getCreatedAt(),
        board.getUpdatedAt()
    );
  }
}