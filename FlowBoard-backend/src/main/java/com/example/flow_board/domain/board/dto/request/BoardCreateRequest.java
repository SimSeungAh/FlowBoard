package com.example.flow_board.domain.board.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BoardCreateRequest(
    @NotBlank(message = "보드 제목은 필수입니다.")
    @Size(max = 100, message = "보드 제목은 100자 이하로 입력해주세요.")
    String title,

    @Size(max = 500, message = "보드 설명은 500자 이하로 입력해주세요.")
    String description
) {
}