package com.example.flow_board.domain.board.service;

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

  @Transactional
  public BoardMemberResponse inviteMember(
      User user,
      Long boardId,
      BoardMemberInviteRequest request
  ) {
    Board board = getBoardById(boardId);

    validateBoardOwner(board, user);
    validateAssignableRole(request.role());

    User invitedUser = userRepository
        .findByEmail(request.email().trim())
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    if (boardMemberRepository.existsByBoardAndUser(board, invitedUser)) {
      throw new CustomException(
          ErrorCode.BOARD_MEMBER_ALREADY_EXISTS
      );
    }

    BoardMember boardMember = new BoardMember(
        board,
        invitedUser,
        request.role()
    );

    BoardMember savedMember = boardMemberRepository.save(boardMember);

    return BoardMemberResponse.from(savedMember);
  }

  public List<BoardMemberResponse> getBoardMembers(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    validateBoardMember(board, user);

    return boardMemberRepository
        .findByBoardOrderByCreatedAtAsc(board)
        .stream()
        .map(BoardMemberResponse::from)
        .toList();
  }

  @Transactional
  public BoardMemberResponse updateMemberRole(
      User user,
      Long boardId,
      Long memberId,
      BoardMemberRoleUpdateRequest request
  ) {
    Board board = getBoardById(boardId);

    validateBoardOwner(board, user);
    validateAssignableRole(request.role());

    BoardMember boardMember = getBoardMember(
        memberId,
        board
    );

    validateTargetIsNotOwner(board, boardMember);

    boardMember.changeRole(request.role());

    return BoardMemberResponse.from(boardMember);
  }

  @Transactional
  public void removeMember(
      User user,
      Long boardId,
      Long memberId
  ) {
    Board board = getBoardById(boardId);

    validateBoardOwner(board, user);

    BoardMember boardMember = getBoardMember(
        memberId,
        board
    );

    validateTargetIsNotOwnerForRemove(board, boardMember);

    boardMemberRepository.delete(boardMember);
  }

  private Board getBoardById(Long boardId) {
    return boardRepository.findById(boardId)
        .orElseThrow(
            () -> new CustomException(ErrorCode.BOARD_NOT_FOUND)
        );
  }

  private BoardMember getBoardMember(
      Long memberId,
      Board board
  ) {
    return boardMemberRepository
        .findByIdAndBoard(memberId, board)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_MEMBER_NOT_FOUND
            )
        );
  }

  private void validateBoardOwner(
      Board board,
      User user
  ) {
    if (!Objects.equals(
        board.getOwner().getId(),
        user.getId()
    )) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }

  private void validateBoardMember(
      Board board,
      User user
  ) {
    if (!boardMemberRepository.existsByBoardAndUser(board, user)) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }

  private void validateAssignableRole(BoardRole role) {
    if (role == BoardRole.OWNER) {
      throw new CustomException(
          ErrorCode.BOARD_OWNER_ROLE_NOT_ALLOWED
      );
    }
  }

  private void validateTargetIsNotOwner(
      Board board,
      BoardMember boardMember
  ) {
    if (
        boardMember.getRole() == BoardRole.OWNER ||
            Objects.equals(
                board.getOwner().getId(),
                boardMember.getUser().getId()
            )
    ) {
      throw new CustomException(
          ErrorCode.BOARD_OWNER_ROLE_CANNOT_BE_CHANGED
      );
    }
  }

  private void validateTargetIsNotOwnerForRemove(
      Board board,
      BoardMember boardMember
  ) {
    if (
        boardMember.getRole() == BoardRole.OWNER ||
            Objects.equals(
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