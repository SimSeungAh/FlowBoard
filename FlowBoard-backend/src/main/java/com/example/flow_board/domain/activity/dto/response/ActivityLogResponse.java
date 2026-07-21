package com.example.flow_board.domain.activity.dto.response;

import com.example.flow_board.domain.activity.entity.ActivityLog;
import com.example.flow_board.domain.activity.entity.ActivityType;

import java.time.LocalDateTime;

/**
 * 보드 활동 로그 조회 응답
 */
public record ActivityLogResponse(
    Long id,
    Long boardId,
    Long actorId,
    String actorNickname,
    ActivityType type,
    Long targetId,
    String targetName,
    String description,
    LocalDateTime createdAt
) {

  public static ActivityLogResponse from(
      ActivityLog activityLog
  ) {
    return new ActivityLogResponse(
        activityLog.getId(),
        activityLog.getBoard().getId(),
        activityLog.getActor().getId(),
        activityLog.getActor().getNickname(),
        activityLog.getType(),
        activityLog.getTargetId(),
        activityLog.getTargetName(),
        activityLog.getDescription(),
        activityLog.getCreatedAt()
    );
  }
}