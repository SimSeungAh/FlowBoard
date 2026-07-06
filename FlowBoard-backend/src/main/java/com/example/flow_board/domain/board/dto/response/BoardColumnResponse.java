package com.example.flow_board.domain.board.dto.response;

import com.example.flow_board.domain.board.entity.BoardColumn;

public record BoardColumnResponse(
    Long id,
    String title,
    Integer position
) {

  public static BoardColumnResponse from(BoardColumn boardColumn) {
    return new BoardColumnResponse(
        boardColumn.getId(),
        boardColumn.getTitle(),
        boardColumn.getPosition()
    );
  }
}