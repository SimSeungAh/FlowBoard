package com.example.flow_board.domain.whiteboard.repository;

import com.example.flow_board.domain.whiteboard.entity.Whiteboard;
import com.example.flow_board.domain.whiteboard.entity.WhiteboardObject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface WhiteboardObjectRepository
    extends JpaRepository<WhiteboardObject, Long> {

  /**
   * 현재 화이트보드의 객체를
   * 레이어 순서대로 조회합니다.
   *
   * zIndex는 두 번째 문자가 대문자인 Java 프로퍼티라
   * Spring Data 파생 쿼리 메서드명에서
   * ZIndex로 잘못 해석될 수 있습니다.
   *
   * 따라서 JPQL에서 실제 엔티티 필드명인
   * zIndex를 명시적으로 사용합니다.
   */
  @Query("""
      SELECT w
      FROM WhiteboardObject w
      WHERE w.whiteboard = :whiteboard
      ORDER BY w.zIndex ASC, w.id ASC
      """)
  List<WhiteboardObject> findOrderedByWhiteboard(
      @Param("whiteboard")
      Whiteboard whiteboard
  );

  /**
   * objectId가 실제로 현재 화이트보드에
   * 포함되어 있는지 함께 확인합니다.
   */
  Optional<WhiteboardObject> findByIdAndWhiteboard(
      Long id,
      Whiteboard whiteboard
  );

  /**
   * 브라우저 UUID 중복 저장 방지.
   */
  boolean existsByWhiteboardAndClientObjectId(
      Whiteboard whiteboard,
      String clientObjectId
  );

  /**
   * 현재 화이트보드에서 사용 중인
   * 가장 큰 zIndex를 조회합니다.
   *
   * 객체가 하나도 없다면 null입니다.
   */
  @Query("""
      SELECT MAX(w.zIndex)
      FROM WhiteboardObject w
      WHERE w.whiteboard = :whiteboard
      """)
  Integer findMaxZIndexByWhiteboard(
      @Param("whiteboard")
      Whiteboard whiteboard
  );

  /**
   * 화이트보드 삭제 전 모든 객체 삭제.
   */
  void deleteByWhiteboard(
      Whiteboard whiteboard
  );
}