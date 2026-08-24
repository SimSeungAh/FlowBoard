package com.example.flow_board.domain.whiteboard.dto.response;

import com.example.flow_board.domain.whiteboard.entity.Whiteboard;

import java.time.LocalDateTime;

public record WhiteboardResponse(

    Long id,

    Long boardId,

    String title,

    String description,

    Integer position,

    boolean defaultWhiteboard,

    String backgroundColor,

    boolean gridEnabled,

    LocalDateTime createdAt,

    LocalDateTime updatedAt

) {

  public static WhiteboardResponse from(
      Whiteboard whiteboard
  ) {
    return new WhiteboardResponse(
        whiteboard.getId(),
        whiteboard.getBoard().getId(),
        whiteboard.getTitle(),
        whiteboard.getDescription(),
        whiteboard.getPosition(),
        whiteboard.isDefaultWhiteboard(),
        whiteboard.getBackgroundColor(),
        whiteboard.isGridEnabled(),
        whiteboard.getCreatedAt(),
        whiteboard.getUpdatedAt()
    );
  }
}