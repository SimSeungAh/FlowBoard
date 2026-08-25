package com.example.flow_board.domain.whiteboard.repository;

import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WhiteboardObjectRepository extends JpaRepository<WhiteboardObject, Long> {

  /**
   * zIndex의 두 번째 문자가 대문자인 필드명을 Spring Data 파생 메서드가
   * ZIndex로 잘못 해석했던 문제를 피하기 위해 명시적 JPQL을 사용합니다.
   */
  @Query("""
      SELECT w
      FROM WhiteboardObject w
      WHERE w.whiteboard = :whiteboard
      ORDER BY w.zIndex ASC, w.id ASC
      """)
  List<WhiteboardObject> findOrderedByWhiteboard(
      @Param("whiteboard") Whiteboard whiteboard
  );

  Optional<WhiteboardObject> findByIdAndWhiteboard(
      Long id,
      Whiteboard whiteboard
  );

  boolean existsByWhiteboardAndClientObjectId(
      Whiteboard whiteboard,
      String clientObjectId
  );

  @Query("""
      SELECT MAX(w.zIndex)
      FROM WhiteboardObject w
      WHERE w.whiteboard = :whiteboard
      """)
  Integer findMaxZIndexByWhiteboard(
      @Param("whiteboard") Whiteboard whiteboard
  );

  void deleteByWhiteboard(Whiteboard whiteboard);
}
