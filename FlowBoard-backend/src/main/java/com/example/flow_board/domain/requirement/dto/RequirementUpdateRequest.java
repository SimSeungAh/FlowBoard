package com.example.flow_board.domain.requirement.dto;

import com.example.flow_board.domain.requirement.entity.RequirementApprovalStatus;
import com.example.flow_board.domain.requirement.entity.RequirementPriority;

public record RequirementUpdateRequest(
    RequirementPriority priority,
    RequirementApprovalStatus approvalStatus,
    String source,
    String targetVersion,
    String acceptanceCriteria
) {
}
