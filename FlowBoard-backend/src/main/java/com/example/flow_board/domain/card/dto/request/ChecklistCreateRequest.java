package com.example.flow_board.domain.card.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChecklistCreateRequest(
    @NotBlank(message = "체크리스트 제목은 필수입니다.")
    @Size(max = 100, message = "체크리스트 제목은 100자 이하로 입력해주세요.")
    String title
) {
}