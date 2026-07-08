package com.example.flow_board.domain.card.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

public record CardMoveRequest(
    @NotNull(message = "이동할 컬럼 ID는 필수입니다.")
    Long targetColumnId,

    @NotNull(message = "이동할 위치는 필수입니다.")
    @PositiveOrZero(message = "이동할 위치는 0 이상이어야 합니다.")
    Integer targetIndex
) {
}