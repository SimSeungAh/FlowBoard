package com.example.flow_board.domain.card.dto.request;

import com.example.flow_board.domain.card.entity.SecuritySeverity;
import com.example.flow_board.domain.card.entity.SecurityVerificationStatus;
import jakarta.validation.constraints.Size;

public record SecurityReviewUpdateRequest(

    /*
     * 보안 심각도
     *
     * CRITICAL
     * HIGH
     * MEDIUM
     * LOW
     */
    SecuritySeverity securitySeverity,

    /*
     * 영향을 받는 시스템 / API / 기능 범위입니다.
     *
     * 예:
     * Web Platform /api/auth/login
     */
    @Size(
        max = 255,
        message = "보안 영향 범위는 255자 이하로 입력해주세요."
    )
    String securityImpactScope,

    /*
     * 검증 상태
     *
     * PENDING
     * IN_PROGRESS
     * RETEST_REQUIRED
     * VERIFIED
     */
    SecurityVerificationStatus securityVerificationStatus

) {
}