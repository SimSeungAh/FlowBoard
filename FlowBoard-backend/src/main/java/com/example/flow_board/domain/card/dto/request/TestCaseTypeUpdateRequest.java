package com.example.flow_board.domain.card.dto.request;

import com.example.flow_board.domain.card.entity.TestCaseType;
import jakarta.validation.constraints.NotNull;

public record TestCaseTypeUpdateRequest(

    @NotNull(
        message = "테스트 케이스 유형은 필수입니다."
    )
    TestCaseType testCaseType

) {
}