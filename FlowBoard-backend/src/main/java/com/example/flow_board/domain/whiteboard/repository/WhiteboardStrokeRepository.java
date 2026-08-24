package com.example.flow_board.domain.whiteboard.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardStroke;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface WhiteboardStrokeRepository
    extends JpaRepository<WhiteboardStroke, Long> {

  /*
   * ------------------------------------------------------------------
   * 다중 화이트보드 기준 조회
   * ------------------------------------------------------------------
   */

  List<WhiteboardStroke> findByWhiteboardOrderByIdAsc(
      Whiteboard whiteboard
  );

  Optional<WhiteboardStroke> findByIdAndWhiteboard(
      Long id,
      Whiteboard whiteboard
  );

  boolean existsByWhiteboardAndClientStrokeId(
      Whiteboard whiteboard,
      String clientStrokeId
  );

  void deleteByWhiteboard(
      Whiteboard whiteboard
  );

  /**
   * 기존 DB 데이터 중 아직 whiteboard_id가 없는 Stroke 조회.
   *
   * 최초 접근 시 기본 화이트보드로 자동 이전하기 위해 사용합니다.
   */
  List<WhiteboardStroke> findByBoardAndWhiteboardIsNullOrderByIdAsc(
      Board board
  );

  /*
   * ------------------------------------------------------------------
   * 레거시 / 보드 단위 호환 메서드
   * ------------------------------------------------------------------
   *
   * 기존 코드와 보드 삭제 로직을 안전하게 유지하기 위해
   * 당분간 제거하지 않습니다.
   */

  List<WhiteboardStroke> findByBoardOrderByIdAsc(
      Board board
  );

  boolean existsByBoardAndClientStrokeId(
      Board board,
      String clientStrokeId
  );

  void deleteByBoard(
      Board board
  );
}