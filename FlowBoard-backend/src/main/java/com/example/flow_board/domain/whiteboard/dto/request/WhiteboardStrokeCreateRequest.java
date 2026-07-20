package com.example.flow_board.domain.whiteboard.dto.request;

import com.example.flow_board.domain.whiteboard.dto.WhiteboardPoint;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardTool;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record WhiteboardStrokeCreateRequest(

    /**
     * 프론트엔드에서 생성한 선의 고유 ID
     *
     * 프론트에서는 crypto.randomUUID()로 생성할 예정
     */
    @NotBlank(message = "클라이언트 선 ID는 필수입니다.")
    @Size(max = 36, message = "클라이언트 선 ID는 36자 이하이어야 합니다.")
    String clientStrokeId,

    /**
     * PEN 또는 ERASER
     */
    @NotNull(message = "화이트보드 도구는 필수입니다.")
    WhiteboardTool tool,

    /**
     * #000000 형태의 색상값
     */
    @NotBlank(message = "선 색상은 필수입니다.")
    @Pattern(
        regexp = "^#[0-9A-Fa-f]{6}$",
        message = "선 색상은 #000000 형식이어야 합니다."
    )
    String color,

    /**
     * 펜 또는 지우개의 굵기
     */
    @NotNull(message = "선 굵기는 필수입니다.")
    @Min(value = 1, message = "선 굵기는 1 이상이어야 합니다.")
    @Max(value = 100, message = "선 굵기는 100 이하이어야 합니다.")
    Integer lineWidth,

    /**
     * 선을 구성하는 좌표 목록
     */
    @Valid
    @NotEmpty(message = "선 좌표는 한 개 이상이어야 합니다.")
    @Size(
        max = 5000,
        message = "하나의 선에는 좌표를 최대 5000개까지 저장할 수 있습니다."
    )
    List<WhiteboardPoint> points
) {
}