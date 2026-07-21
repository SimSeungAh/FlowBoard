package com.example.flow_board.domain.board.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.dto.request.BoardMemberInviteRequest;
import com.example.flow_board.domain.board.dto.request.BoardMemberRoleUpdateRequest;
import com.example.flow_board.domain.board.dto.response.BoardMemberResponse;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.user.repository.UserRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BoardMemberService {

  private final BoardRepository boardRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final UserRepository userRepository;
  private final ActivityLogService activityLogService;

  /**
   * 보드 멤버 초대
   * 보드 OWNER만 사용할 수 있음
   */
  @Transactional
  public BoardMemberResponse inviteMember(
      User user,
      Long boardId,
      BoardMemberInviteRequest request
  ) {
    Board board = getBoardById(boardId);

    validateBoardOwner(
        board,
        user
    );

    validateAssignableRole(
        request.role()
    );

    User invitedUser = userRepository
        .findByEmail(
            request.email().trim()
        )
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.USER_NOT_FOUND
            )
        );

    boolean alreadyMember =
        boardMemberRepository.existsByBoardAndUser(
            board,
            invitedUser
        );

    if (alreadyMember) {
      throw new CustomException(
          ErrorCode.BOARD_MEMBER_ALREADY_EXISTS
      );
    }

    BoardMember boardMember =
        new BoardMember(
            board,
            invitedUser,
            request.role()
        );

    BoardMember savedMember =
        boardMemberRepository.save(
            boardMember
        );

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.MEMBER_INVITED,
        savedMember.getId(),
        invitedUser.getNickname(),
        user.getNickname()
            + "님이 "
            + invitedUser.getNickname()
            + "님을 "
            + savedMember.getRole().name()
            + " 권한으로 보드에 초대했습니다."
    );

    return BoardMemberResponse.from(
        savedMember
    );
  }

  /**
   * 보드 멤버 목록 조회
   * OWNER, MEMBER, VIEWER 모두 조회할 수 있음
   */
  public List<BoardMemberResponse> getBoardMembers(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    validateBoardMember(
        board,
        user
    );

    return boardMemberRepository
        .findByBoardOrderByCreatedAtAsc(
            board
        )
        .stream()
        .map(BoardMemberResponse::from)
        .toList();
  }

  /**
   * 보드 멤버 권한 변경
   * 보드 OWNER만 사용할 수 있음
   */
  @Transactional
  public BoardMemberResponse updateMemberRole(
      User user,
      Long boardId,
      Long memberId,
      BoardMemberRoleUpdateRequest request
  ) {
    Board board = getBoardById(boardId);

    validateBoardOwner(
        board,
        user
    );

    validateAssignableRole(
        request.role()
    );

    BoardMember boardMember =
        getBoardMember(
            memberId,
            board
        );

    validateTargetIsNotOwner(
        board,
        boardMember
    );

    BoardRole oldRole =
        boardMember.getRole();

    boardMember.changeRole(
        request.role()
    );

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.MEMBER_ROLE_CHANGED,
        boardMember.getId(),
        boardMember.getUser().getNickname(),
        user.getNickname()
            + "님이 "
            + boardMember.getUser().getNickname()
            + "님의 권한을 "
            + oldRole.name()
            + "에서 "
            + boardMember.getRole().name()
            + "(으)로 변경했습니다."
    );

    return BoardMemberResponse.from(
        boardMember
    );
  }

  /**
   * 보드 멤버 삭제
   * 보드 OWNER만 사용할 수 있음
   */
  @Transactional
  public void removeMember(
      User user,
      Long boardId,
      Long memberId
  ) {
    Board board = getBoardById(boardId);

    validateBoardOwner(
        board,
        user
    );

    BoardMember boardMember =
        getBoardMember(
            memberId,
            board
        );

    validateTargetIsNotOwnerForRemove(
        board,
        boardMember
    );

    Long removedMemberId =
        boardMember.getId();

    String removedMemberNickname =
        boardMember
            .getUser()
            .getNickname();

    boardMemberRepository.delete(
        boardMember
    );

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.MEMBER_REMOVED,
        removedMemberId,
        removedMemberNickname,
        user.getNickname()
            + "님이 "
            + removedMemberNickname
            + "님을 보드에서 제외했습니다."
    );
  }

  /**
   * 보드 조회
   */
  private Board getBoardById(
      Long boardId
  ) {
    return boardRepository
        .findById(boardId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_NOT_FOUND
            )
        );
  }

  /**
   * 특정 보드에 속한 멤버 조회
   */
  private BoardMember getBoardMember(
      Long memberId,
      Board board
  ) {
    return boardMemberRepository
        .findByIdAndBoard(
            memberId,
            board
        )
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_MEMBER_NOT_FOUND
            )
        );
  }

  /**
   * 현재 사용자가 보드 OWNER인지 검사
   */
  private void validateBoardOwner(
      Board board,
      User user
  ) {
    if (
        !Objects.equals(
            board.getOwner().getId(),
            user.getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }

  /**
   * 현재 사용자가 보드 멤버인지 검사
   */
  private void validateBoardMember(
      Board board,
      User user
  ) {
    boolean isBoardMember =
        boardMemberRepository.existsByBoardAndUser(
            board,
            user
        );

    if (!isBoardMember) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }

  /**
   * OWNER 역할은 다른 사용자에게 직접 부여할 수 없음
   */
  private void validateAssignableRole(
      BoardRole role
  ) {
    if (role == BoardRole.OWNER) {
      throw new CustomException(
          ErrorCode.BOARD_OWNER_ROLE_NOT_ALLOWED
      );
    }
  }

  /**
   * 보드 소유자의 역할 변경 방지
   */
  private void validateTargetIsNotOwner(
      Board board,
      BoardMember boardMember
  ) {
    if (
        boardMember.getRole() == BoardRole.OWNER
            || Objects.equals(
            board.getOwner().getId(),
            boardMember.getUser().getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.BOARD_OWNER_ROLE_CANNOT_BE_CHANGED
      );
    }
  }

  /**
   * 보드 소유자의 멤버 삭제 방지
   */
  private void validateTargetIsNotOwnerForRemove(
      Board board,
      BoardMember boardMember
  ) {
    if (
        boardMember.getRole() == BoardRole.OWNER
            || Objects.equals(
            board.getOwner().getId(),
            boardMember.getUser().getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.BOARD_OWNER_CANNOT_BE_REMOVED
      );
    }
  }
}