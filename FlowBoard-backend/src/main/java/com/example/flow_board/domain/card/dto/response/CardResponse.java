package com.example.flow_board.domain.card.dto.response;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.entity.SecuritySeverity;
import com.example.flow_board.domain.card.entity.SecurityVerificationStatus;
import com.example.flow_board.domain.card.entity.TestCaseResult;
import com.example.flow_board.domain.card.entity.TestCaseType;

import java.time.LocalDateTime;

public record CardResponse(

    Long id,

    Long columnId,

    Long createdById,

    String createdByNickname,

    String title,

    String description,

    String rank,

    LocalDateTime startDate,

    LocalDateTime dueDate,

    CardTaskType taskType,

    TestCaseType testCaseType,

    TestCaseResult testCaseResult,

    SecuritySeverity securitySeverity,

    String securityImpactScope,

    SecurityVerificationStatus securityVerificationStatus,

    LocalDateTime createdAt,

    LocalDateTime updatedAt

) {

  public static CardResponse from(
      Card card
  ) {
    return new CardResponse(
        card.getId(),
        card.getBoardColumn().getId(),
        card.getCreatedBy().getId(),
        card.getCreatedBy().getNickname(),
        card.getTitle(),
        card.getDescription(),
        card.getRank(),

        card.getStartDate(),
        card.getDueDate(),

        card.getTaskType(),
        card.getTestCaseType(),
        card.getTestCaseResult(),

        card.getSecuritySeverity(),
        card.getSecurityImpactScope(),
        card.getSecurityVerificationStatus(),

        card.getCreatedAt(),
        card.getUpdatedAt()
    );
  }
}