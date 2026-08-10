package com.example.flow_board.domain.activity.service;

import com.example.flow_board.domain.activity.dto.response.ActivityLogResponse;
import com.example.flow_board.domain.activity.entity.ActivityLog;
import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.repository.ActivityLogRepository;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActivityLogService {

  private static final long WHITEBOARD_ACTIVITY_INTERVAL_MINUTES = 5L;

  private final ActivityLogRepository activityLogRepository;
  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;

  /**
   * 일반 활동 로그 저장
   */
  @Transactional
  public ActivityLogResponse recordActivity(
          Board board,
          User actor,
          ActivityType type,
          Long targetId,
          String targetName,
          String description
  ) {
    ActivityLog activityLog =
            new ActivityLog(
                    board,
                    actor,
                    type,
                    targetId,
                    targetName,
                    description
            );

    ActivityLog savedActivityLog =
            activityLogRepository.save(
                    activityLog
            );

    return ActivityLogResponse.from(
            savedActivityLog
    );
  }

  /**
   * 화이트보드 활동 로그 제한
   *
   * 같은 사용자가 같은 보드에서 계속 작업하는 경우
   * 5분 동안 최대 1개의 활동 로그만 기록합니다.
   */
  @Transactional
  public void recordWhiteboardActivityIfNeeded(
          Board board,
          User actor,
          Long strokeId
  ) {
    LocalDateTime threshold =
            LocalDateTime.now()
                    .minusMinutes(
                            WHITEBOARD_ACTIVITY_INTERVAL_MINUTES
                    );

    boolean recentlyRecorded =
            activityLogRepository
                    .existsByBoardAndActorAndTypeAndCreatedAtAfter(
                            board,
                            actor,
                            ActivityType.WHITEBOARD_STROKE_CREATED,
                            threshold
                    );

    if (recentlyRecorded) {
      return;
    }

    ActivityLog activityLog =
            new ActivityLog(
                    board,
                    actor,
                    ActivityType.WHITEBOARD_STROKE_CREATED,
                    strokeId,
                    "화이트보드",
                    actor.getNickname()
                            + "님이 화이트보드에서 작업했습니다."
            );

    activityLogRepository.save(
            activityLog
    );
  }

  /**
   * 보드 활동 로그 조회
   *
   * OWNER / MEMBER / VIEWER 모두 가능합니다.
   */
  public Page<ActivityLogResponse> getBoardActivities(
          User user,
          Long boardId,
          Pageable pageable
  ) {
    Board board =
            getBoardById(boardId);

    boardPermissionService.validateReadPermission(
            board,
            user
    );

    return activityLogRepository
            .findByBoardOrderByCreatedAtDesc(
                    board,
                    pageable
            )
            .map(
                    ActivityLogResponse::from
            );
  }

  private Board getBoardById(
          Long boardId
  ) {
    return boardRepository
            .findById(boardId)
            .orElseThrow(
                    () -> new CustomException(
                            ErrorCode.BOARD_NOT_FOUND
                    )
            );
  }
}