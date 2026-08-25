package com.example.flow_board.domain.presence.dto;

import com.example.flow_board.domain.presence.entity.BoardPresenceSection;
import jakarta.validation.constraints.NotNull;

public record BoardPresenceHeartbeatRequest(
    @NotNull(message = "현재 화면 정보는 필수입니다.")
    BoardPresenceSection section,
    Long whiteboardId
) {
}
