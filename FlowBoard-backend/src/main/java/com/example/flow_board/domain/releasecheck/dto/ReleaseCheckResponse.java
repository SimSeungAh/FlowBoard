package com.example.flow_board.domain.releasecheck.dto;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.releasecheck.entity.ReleaseCheckMetadata;
import com.example.flow_board.domain.releasecheck.entity.ReleaseEnvironment;
import com.example.flow_board.domain.releasecheck.entity.ReleaseStatus;
import com.example.flow_board.domain.releasecheck.entity.SmokeTestStatus;

import java.time.LocalDateTime;

public record ReleaseCheckResponse(
    Long cardId,
    ReleaseStatus releaseStatus,
    ReleaseEnvironment targetEnvironment,
    String version,
    SmokeTestStatus smokeTestStatus,
    String releaseNotes,
    String rollbackPlan,
    LocalDateTime updatedAt
) {
  public static ReleaseCheckResponse from(Card card, ReleaseCheckMetadata metadata) {
    if (metadata == null) {
      return new ReleaseCheckResponse(
          card.getId(),
          ReleaseStatus.PREPARING,
          ReleaseEnvironment.PRODUCTION,
          null,
          SmokeTestStatus.PENDING,
          null,
          null,
          card.getUpdatedAt()
      );
    }

    return new ReleaseCheckResponse(
        card.getId(),
        metadata.getReleaseStatus(),
        metadata.getTargetEnvironment(),
        metadata.getVersion(),
        metadata.getSmokeTestStatus(),
        metadata.getReleaseNotes(),
        metadata.getRollbackPlan(),
        metadata.getUpdatedAt()
    );
  }
}
