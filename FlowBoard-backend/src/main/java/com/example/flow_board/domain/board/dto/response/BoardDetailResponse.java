package com.example.flow_board.domain.board.dto.response;

import com.example.flow_board.domain.board.entity.Board;

import java.time.LocalDateTime;
import java.util.List;

public record BoardDetailResponse(
    Long id,
    String title,
    String description,
    String backgroundColor,
    Long ownerId,
    String ownerNickname,
    List<BoardColumnResponse> columns,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static BoardDetailResponse from(
      Board board,
      List<BoardColumnResponse> columns
  ) {
    return new BoardDetailResponse(
        board.getId(),
        board.getTitle(),
        board.getDescription(),
        board.getBackgroundColor(),
        board.getOwner().getId(),
        board.getOwner().getNickname(),
        columns,
        board.getCreatedAt(),
        board.getUpdatedAt()
    );
  }
}