package com.example.flow_board.domain.activity.repository;

import com.example.flow_board.domain.activity.entity.ActivityLog;
import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface ActivityLogRepository
        extends JpaRepository<ActivityLog, Long> {

  /**
   * 특정 보드의 활동 로그를 최신순으로 조회합니다.
   *
   * 응답 변환 과정에서 사용자 정보가 필요하므로
   * actor를 함께 조회해 N+1 쿼리를 방지합니다.
   */
  @EntityGraph(attributePaths = "actor")
  Page<ActivityLog> findByBoardOrderByCreatedAtDesc(
          Board board,
          Pageable pageable
  );

  /**
   * 특정 보드의 활동 로그를 모두 삭제합니다.
   *
   * 보드를 삭제하기 전에 사용합니다.
   */
  void deleteByBoard(
          Board board
  );

  /**
   * 특정 시각 이후 동일 사용자의 동일 활동 종류가
   * 이미 기록되어 있는지 확인합니다.
   *
   * 화이트보드처럼 짧은 시간에 매우 많은 이벤트가
   * 발생하는 기능의 활동 로그 중복을 줄일 때 사용합니다.
   */
  boolean existsByBoardAndActorAndTypeAndCreatedAtAfter(
          Board board,
          User actor,
          ActivityType type,
          LocalDateTime createdAt
  );
}