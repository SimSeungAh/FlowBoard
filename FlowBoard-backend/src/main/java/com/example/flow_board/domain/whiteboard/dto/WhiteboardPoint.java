package com.example.flow_board.domain.whiteboard.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * 화이트보드 선을 구성하는 좌표 하나
 * Canvas 왼쪽 위가 기준점이며 x, y 좌표는 0 이상이어야 함
 */
public record WhiteboardPoint(

    @NotNull(message = "X 좌표는 필수입니다.")
    @PositiveOrZero(message = "X 좌표는 0 이상이어야 합니다.")
    Double x,

    @NotNull(message = "Y 좌표는 필수입니다.")
    @PositiveOrZero(message = "Y 좌표는 0 이상이어야 합니다.")
    Double y
) {
}