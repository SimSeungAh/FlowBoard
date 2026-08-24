package com.example.flow_board.domain.card.dto.request;

import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.entity.TestCaseType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record CardCreateRequest(

    @NotBlank(message = "카드 제목은 필수입니다.")
    @Size(
        max = 100,
        message = "카드 제목은 100자 이하로 입력해주세요."
    )
    String title,

    String description,

    LocalDateTime startDate,

    LocalDateTime dueDate,

    /*
     * 카드의 작업 형식입니다.
     *
     * 값이 전달되지 않으면
     * Card Entity에서 GENERAL로 처리합니다.
     */
    CardTaskType taskType,

    /*
     * 테스트 케이스 카드에서만 사용합니다.
     *
     * TEST_CASE가 아닌 카드에서는
     * Entity에서 null로 정리됩니다.
     */
    TestCaseType testCaseType

) {
}