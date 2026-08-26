package com.example.flow_board.domain.whiteboard.dto.response;

import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardGridType;

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
    WhiteboardGridType gridType,
    Integer gridSize,
    Double gridOpacity,
    Integer canvasWidth,
    Integer canvasHeight,
    boolean locked,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static WhiteboardResponse from(Whiteboard whiteboard) {
    return new WhiteboardResponse(
        whiteboard.getId(),
        whiteboard.getBoard().getId(),
        whiteboard.getTitle(),
        whiteboard.getDescription(),
        whiteboard.getPosition(),
        whiteboard.isDefaultWhiteboard(),
        whiteboard.getBackgroundColor(),
        whiteboard.isGridEnabled(),
        whiteboard.getGridType(),
        whiteboard.getGridSize(),
        whiteboard.getGridOpacity(),
        whiteboard.getCanvasWidth(),
        whiteboard.getCanvasHeight(),
        whiteboard.isLocked(),
        whiteboard.getCreatedAt(),
        whiteboard.getUpdatedAt()
    );
  }
}
