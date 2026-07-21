package com.example.flow_board.domain.board.repository;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BoardMemberRepository
    extends JpaRepository<BoardMember, Long> {

  /**
   * 로그인한 사용자가 참여 중인 모든 보드를 조회
   * OWNER, MEMBER, VIEWER 역할을 모두 포함하며, 최근 수정된 보드가 먼저 반환
   * 목록 응답에 필요한 Board와 Owner 정보를 fetch join으로 한 번에 조회
   */
  @Query("""
      select boardMember
      from BoardMember boardMember
      join fetch boardMember.board board
      join fetch board.owner
      where boardMember.user = :user
      order by board.updatedAt desc
      """)
  List<BoardMember>
  findAllByUserWithBoardAndOwnerOrderByBoardUpdatedAtDesc(
      @Param("user") User user
  );

  /**
   * 특정 보드의 모든 멤버를 조회
   * 보드 삭제 전 멤버 연결을 정리할 때도 사용
   */
  List<BoardMember> findByBoard(
      Board board
  );

  /**
   * 보드 멤버 목록을 참여 순서대로 조회
   */
  List<BoardMember> findByBoardOrderByCreatedAtAsc(
      Board board
  );

  /**
   * 특정 보드와 사용자에 해당하는 멤버 연결 정보를 조회
   */
  Optional<BoardMember> findByBoardAndUser(
      Board board,
      User user
  );

  /**
   * 특정 보드에 속한 멤버 연결 정보를 멤버 ID로 조회
   */
  Optional<BoardMember> findByIdAndBoard(
      Long id,
      Board board
  );

  /**
   * 사용자가 해당 보드의 멤버인지 확인
   */
  boolean existsByBoardAndUser(
      Board board,
      User user
  );
}