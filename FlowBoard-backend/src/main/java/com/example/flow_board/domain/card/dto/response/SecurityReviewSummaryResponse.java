package com.example.flow_board.domain.card.dto.response;

public record SecurityReviewSummaryResponse(

    long total,

    long critical,

    long high,

    long medium,

    long low,

    long pending

) {
}