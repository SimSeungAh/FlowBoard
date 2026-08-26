package com.example.flow_board.domain.designreview.dto;

import com.example.flow_board.domain.designreview.entity.DesignReviewStatus;

public record DesignReviewUpdateRequest(
    DesignReviewStatus reviewStatus,
    String designUrl,
    String reviewScope
) {
}
