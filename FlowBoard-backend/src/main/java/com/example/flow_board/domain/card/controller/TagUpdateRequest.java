package com.example.flow_board.domain.card.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TagUpdateRequest(
    @NotBlank(message = "태그 이름은 필수입니다.")
    @Size(max = 30, message = "태그 이름은 30자 이하로 입력해주세요.")
    String name,

    @NotBlank(message = "태그 색상은 필수입니다.")
    @Size(max = 20, message = "태그 색상은 20자 이하로 입력해주세요.")
    String color
) {
}