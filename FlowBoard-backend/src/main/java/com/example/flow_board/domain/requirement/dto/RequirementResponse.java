package com.example.flow_board.domain.requirement.dto;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.requirement.entity.RequirementApprovalStatus;
import com.example.flow_board.domain.requirement.entity.RequirementMetadata;
import com.example.flow_board.domain.requirement.entity.RequirementPriority;

import java.time.LocalDateTime;

public record RequirementResponse(
    Long cardId,
    String title,
    RequirementPriority priority,
    RequirementApprovalStatus approvalStatus,
    String source,
    String targetVersion,
    String acceptanceCriteria,
    LocalDateTime updatedAt
) {
  public static RequirementResponse from(Card card, RequirementMetadata metadata) {
    return new RequirementResponse(
        card.getId(),
        card.getTitle(),
        metadata == null ? RequirementPriority.MEDIUM : metadata.getPriority(),
        metadata == null ? RequirementApprovalStatus.DRAFT : metadata.getApprovalStatus(),
        metadata == null ? null : metadata.getSource(),
        metadata == null ? null : metadata.getTargetVersion(),
        metadata == null ? null : metadata.getAcceptanceCriteria(),
        metadata == null ? card.getUpdatedAt() : metadata.getUpdatedAt()
    );
  }
}
