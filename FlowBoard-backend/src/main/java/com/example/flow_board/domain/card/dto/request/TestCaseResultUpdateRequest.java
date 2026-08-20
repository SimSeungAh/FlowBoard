package com.example.flow_board.domain.card.dto.request;

import com.example.flow_board.domain.card.entity.TestCaseResult;
import jakarta.validation.constraints.NotNull;

public record TestCaseResultUpdateRequest(

    @NotNull(
        message = "테스트 결과는 필수입니다."
    )
    TestCaseResult testCaseResult

) {
}