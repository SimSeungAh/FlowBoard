package com.example.flow_board.domain.activity.repository;

import com.example.flow_board.domain.activity.entity.ActivityLog;
import com.example.flow_board.domain.board.entity.Board;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ActivityLogRepository
    extends JpaRepository<ActivityLog, Long> {

  /**
   * 특정 보드의 활동 로그를 최신순으로 조회
   * 응답 변환 과정에서 사용자 정보가 필요하므로 actor를 함께 조회해 N+1 쿼리를 방지
   */
  @EntityGraph(attributePaths = "actor")
  Page<ActivityLog> findByBoardOrderByCreatedAtDesc(
      Board board,
      Pageable pageable
  );

  /**
   * 특정 보드의 활동 로그를 모두 삭제
   * 보드를 삭제하기 전에 활동 로그가 해당 보드를 참조하지 않도록 정리할 때 사용
   */
  void deleteByBoard(
      Board board
  );
}