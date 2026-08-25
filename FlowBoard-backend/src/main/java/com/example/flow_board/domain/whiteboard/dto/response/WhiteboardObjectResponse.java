package com.example.flow_board.domain.whiteboard.dto.response;

import com.example.flow_board.domain.whiteboard.entity.WhiteboardObject;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardObjectType;

import java.time.LocalDateTime;

public record WhiteboardObjectResponse(
    Long id,
    Long whiteboardId,
    Long createdById,
    String createdByNickname,
    String clientObjectId,
    WhiteboardObjectType type,
    Double x,
    Double y,
    Double width,
    Double height,
    Double rotation,
    String content,
    String fillColor,
    String strokeColor,
    Integer strokeWidth,
    Integer fontSize,
    Integer zIndex,
    boolean locked,
    String propertiesJson,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static WhiteboardObjectResponse from(WhiteboardObject object) {
    return new WhiteboardObjectResponse(
        object.getId(),
        object.getWhiteboard().getId(),
        object.getCreatedBy().getId(),
        object.getCreatedBy().getNickname(),
        object.getClientObjectId(),
        object.getType(),
        object.getX(),
        object.getY(),
        object.getWidth(),
        object.getHeight(),
        object.getRotation(),
        object.getContent(),
        object.getFillColor(),
        object.getStrokeColor(),
        object.getStrokeWidth(),
        object.getFontSize(),
        object.getZIndex(),
        object.isLocked(),
        object.getPropertiesJson(),
        object.getCreatedAt(),
        object.getUpdatedAt()
    );
  }
}
