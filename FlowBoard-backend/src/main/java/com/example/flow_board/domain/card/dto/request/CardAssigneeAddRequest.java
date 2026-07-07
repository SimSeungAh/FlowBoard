package com.example.flow_board.domain.card.dto.request;

import jakarta.validation.constraints.NotNull;

public record CardAssigneeAddRequest(
    @NotNull(message = "담당자 사용자 ID는 필수입니다.")
    Long userId
) {
}