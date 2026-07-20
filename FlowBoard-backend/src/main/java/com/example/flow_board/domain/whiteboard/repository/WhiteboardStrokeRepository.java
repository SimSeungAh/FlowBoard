package com.example.flow_board.domain.whiteboard.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardStroke;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WhiteboardStrokeRepository
    extends JpaRepository<WhiteboardStroke, Long> {

  /**
   * 특정 보드에 저장된 모든 선을 저장된 순서대로 조회
   */
  List<WhiteboardStroke> findByBoardOrderByIdAsc(Board board);

  /**
   * 동일한 클라이언트 선 ID가 이미 저장되어 있는지 확인
   * WebSocket이나 네트워크 재요청으로 같은 선이 중복 저장되는 것을 방지할 때 사용
   */
  boolean existsByBoardAndClientStrokeId(
      Board board,
      String clientStrokeId
  );

  /**
   * 특정 보드에 저장된 모든 선을 삭제
   * 화이트보드 전체 지우기 기능에서 사용
   */
  void deleteByBoard(Board board);
}