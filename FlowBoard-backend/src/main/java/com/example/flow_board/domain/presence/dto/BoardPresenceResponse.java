package com.example.flow_board.domain.presence.dto;

import com.example.flow_board.domain.presence.entity.BoardPresenceSection;

public record BoardPresenceResponse(
    Long userId,
    String nickname,
    BoardPresenceSection section,
    Long whiteboardId,
    String whiteboardTitle,
    Long lastSeenAt
) {
}
