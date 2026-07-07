package com.example.flow_board.domain.card.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChecklistItemCreateRequest(
    @NotBlank(message = "체크리스트 항목 내용은 필수입니다.")
    @Size(max = 255, message = "체크리스트 항목은 255자 이하로 입력해주세요.")
    String content
) {
}