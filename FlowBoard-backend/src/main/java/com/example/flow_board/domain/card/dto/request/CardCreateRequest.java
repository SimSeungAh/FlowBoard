package com.example.flow_board.domain.card.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CardCreateRequest(
    @NotBlank(message = "카드 제목은 필수입니다.")
    @Size(max = 100, message = "카드 제목은 100자 이하로 입력해주세요.")
    String title,

    String description,

    LocalDateTime dueDate
) {
}