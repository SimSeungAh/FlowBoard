package com.example.flow_board.domain.board.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 보드 기능의 공통 권한 검사 서비스입니다.
 *
 * OWNER:
 * 조회, 일반 수정, 보드 관리 가능
 *
 * MEMBER:
 * 조회, 카드·댓글·화이트보드 등 일반 수정 가능
 *
 * VIEWER:
 * 조회만 가능
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardPermissionService {

  private final BoardMemberRepository boardMemberRepository;

  /**
   * 현재 사용자의 보드 멤버 정보를 조회
   * 보드에 참여하지 않은 사용자는 접근할 수 없음
   */
  public BoardMember getBoardMember(
      Board board,
      User user
  ) {
    return boardMemberRepository
        .findByBoardAndUser(
            board,
            user
        )
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_ACCESS_DENIED
            )
        );
  }

  /**
   * 보드 조회 권한 검사
   *
   * OWNER, MEMBER, VIEWER 모두 통과합니다.
   */
  public BoardMember validateReadPermission(
      Board board,
      User user
  ) {
    return getBoardMember(
        board,
        user
    );
  }

  /**
   * 보드 일반 쓰기 권한 검사
   *
   * OWNER와 MEMBER만 통과합니다.
   * VIEWER는 카드·댓글·태그·체크리스트·
   * 화이트보드 등을 변경할 수 없습니다.
   */
  public BoardMember validateWritePermission(
      Board board,
      User user
  ) {
    BoardMember boardMember =
        getBoardMember(
            board,
            user
        );

    if (
        boardMember.getRole()
            == BoardRole.VIEWER
    ) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }

    return boardMember;
  }

  /**
   * 보드 OWNER 권한 검사
   *
   * 보드 수정·삭제 및 팀원 관리처럼
   * OWNER 전용 기능에서 사용합니다.
   */
  public BoardMember validateOwnerPermission(
      Board board,
      User user
  ) {
    BoardMember boardMember =
        getBoardMember(
            board,
            user
        );

    if (
        boardMember.getRole()
            != BoardRole.OWNER
    ) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }

    return boardMember;
  }

  /**
   * 사용자가 VIEWER인지 확인합니다.
   *
   * 프론트 응답 구성이나 조건 분기에 사용할 수 있습니다.
   */
  public boolean isViewer(
      Board board,
      User user
  ) {
    return getBoardMember(
        board,
        user
    ).getRole() == BoardRole.VIEWER;
  }
}