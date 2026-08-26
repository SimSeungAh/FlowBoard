package com.example.flow_board.domain.requirement.dto;

public record RequirementSummaryResponse(
    long total,
    long critical,
    long high,
    long medium,
    long low,
    long draft,
    long inReview,
    long approved,
    long changesRequested,
    long rejected
) {
}
