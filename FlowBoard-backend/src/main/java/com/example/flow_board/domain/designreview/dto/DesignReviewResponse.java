package com.example.flow_board.domain.designreview.dto;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.designreview.entity.DesignReviewMetadata;
import com.example.flow_board.domain.designreview.entity.DesignReviewStatus;

import java.time.LocalDateTime;

public record DesignReviewResponse(
    Long cardId,
    String title,
    DesignReviewStatus reviewStatus,
    String designUrl,
    String reviewScope,
    LocalDateTime updatedAt
) {
  public static DesignReviewResponse from(Card card, DesignReviewMetadata metadata) {
    return new DesignReviewResponse(
        card.getId(),
        card.getTitle(),
        metadata == null ? DesignReviewStatus.PENDING : metadata.getReviewStatus(),
        metadata == null ? null : metadata.getDesignUrl(),
        metadata == null ? null : metadata.getReviewScope(),
        metadata == null ? card.getUpdatedAt() : metadata.getUpdatedAt()
    );
  }
}
