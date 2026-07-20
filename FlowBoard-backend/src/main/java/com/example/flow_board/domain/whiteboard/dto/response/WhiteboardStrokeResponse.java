package com.example.flow_board.domain.whiteboard.dto.response;

import com.example.flow_board.domain.whiteboard.dto.WhiteboardPoint;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardStroke;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardTool;

import java.time.LocalDateTime;
import java.util.List;

public record WhiteboardStrokeResponse(
    Long id,
    Long boardId,
    Long userId,
    String userNickname,
    String clientStrokeId,
    WhiteboardTool tool,
    String color,
    Integer lineWidth,
    List<WhiteboardPoint> points,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static WhiteboardStrokeResponse from(
      WhiteboardStroke stroke,
      List<WhiteboardPoint> points
  ) {
    return new WhiteboardStrokeResponse(
        stroke.getId(),
        stroke.getBoard().getId(),
        stroke.getUser().getId(),
        stroke.getUser().getNickname(),
        stroke.getClientStrokeId(),
        stroke.getTool(),
        stroke.getColor(),
        stroke.getLineWidth(),
        List.copyOf(points),
        stroke.getCreatedAt(),
        stroke.getUpdatedAt()
    );
  }
}