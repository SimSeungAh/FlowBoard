package com.example.flow_board.domain.activity.service;

import com.example.flow_board.domain.activity.dto.response.ActivityLogResponse;
import com.example.flow_board.domain.activity.entity.ActivityLog;
import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.repository.ActivityLogRepository;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ActivityLogService {

  private final ActivityLogRepository activityLogRepository;
  private final BoardRepository boardRepository;
  private final BoardMemberRepository boardMemberRepository;

  /**
   * 보드 활동 로그를 저장
   * 카드, 댓글, 태그, 멤버, 화이트보드 등 다른 도메인 서비스에서 공통으로 호출
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
    ActivityLog activityLog = new ActivityLog(
        board,
        actor,
        type,
        targetId,
        targetName,
        description
    );

    ActivityLog savedActivityLog =
        activityLogRepository.save(activityLog);

    return ActivityLogResponse.from(
        savedActivityLog
    );
  }

  /**
   * 특정 보드의 활동 로그를 최신순으로 조회
   * OWNER, MEMBER, VIEWER 모두 조회할 수 있음
   */
  public Page<ActivityLogResponse> getBoardActivities(
      User user,
      Long boardId,
      Pageable pageable
  ) {
    Board board = getBoardById(boardId);

    validateBoardAccess(
        board,
        user
    );

    return activityLogRepository
        .findByBoardOrderByCreatedAtDesc(
            board,
            pageable
        )
        .map(ActivityLogResponse::from);
  }

  /**
   * 보드 조회
   */
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

  /**
   * 현재 사용자가 해당 보드의 멤버인지 검사
   */
  private void validateBoardAccess(
      Board board,
      User user
  ) {
    boolean hasAccess =
        boardMemberRepository.existsByBoardAndUser(
            board,
            user
        );

    if (!hasAccess) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }
}