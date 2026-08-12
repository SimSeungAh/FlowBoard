package com.example.flow_board.domain.whiteboard.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardStroke;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WhiteboardStrokeRepository
    extends JpaRepository<WhiteboardStroke, Long> {

  /**
   * 보드에 저장된 선을 저장 순서대로 조회합니다.
   *
   * Canvas 복원 시 이 순서대로 다시 그리면
   * 기존 화이트보드 상태를 재구성할 수 있습니다.
   */
  List<WhiteboardStroke> findByBoardOrderByIdAsc(
      Board board
  );

  /**
   * 프론트에서 생성한 clientStrokeId가
   * 이미 저장되어 있는지 확인합니다.
   *
   * 네트워크 재시도나 중복 요청으로 인해
   * 동일 선이 두 번 저장되는 것을 방지합니다.
   */
  boolean existsByBoardAndClientStrokeId(
      Board board,
      String clientStrokeId
  );

  /**
   * 보드의 모든 화이트보드 선 삭제
   *
   * 화이트보드 전체 초기화와
   * 보드 삭제 시 사용합니다.
   */
  void deleteByBoard(
      Board board
  );
}