package com.example.flow_board.domain.whiteboard.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WhiteboardRepository
    extends JpaRepository<Whiteboard, Long> {

  /**
   * 현재 보드에 존재하는 화이트보드를
   * 사용자가 정한 순서대로 조회합니다.
   */
  List<Whiteboard> findByBoardOrderByPositionAsc(
      Board board
  );

  /**
   * whiteboardId가 실제로 현재 보드에
   * 포함되어 있는지까지 함께 확인합니다.
   */
  Optional<Whiteboard> findByIdAndBoard(
      Long id,
      Board board
  );

  /**
   * 가장 첫 번째 화이트보드 조회.
   *
   * 기본 화이트보드가 없는 과거 데이터의
   * fallback 용도로도 사용할 수 있습니다.
   */
  Optional<Whiteboard> findFirstByBoardOrderByPositionAsc(
      Board board
  );

  /**
   * 현재 보드의 기본 화이트보드 조회.
   */
  Optional<Whiteboard> findByBoardAndDefaultWhiteboardTrue(
      Board board
  );

  /**
   * 기본 화이트보드가 존재하는지 확인.
   */
  boolean existsByBoardAndDefaultWhiteboardTrue(
      Board board
  );

  /**
   * 현재 보드의 화이트보드 개수.
   */
  long countByBoard(
      Board board
  );

  /**
   * 보드 삭제 시 화이트보드 전체 삭제에 사용합니다.
   */
  void deleteByBoard(
      Board board
  );
}