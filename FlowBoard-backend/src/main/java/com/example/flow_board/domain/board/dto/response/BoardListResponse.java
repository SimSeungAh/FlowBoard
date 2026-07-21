package com.example.flow_board.domain.board.dto.response;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;

import java.time.LocalDateTime;

/**
 * 로그인한 사용자가 참여 중인 보드 목록 응답
 * 사용자가 직접 만든 보드뿐 아니라 MEMBER 또는 VIEWER로 초대받은 보드도 포함
 */
public record BoardListResponse(
    Long id,
    String title,
    String description,
    String backgroundColor,
    Long ownerId,
    String ownerNickname,
    BoardRole myRole,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static BoardListResponse from(
      BoardMember boardMember
  ) {
    Board board =
        boardMember.getBoard();

    return new BoardListResponse(
        board.getId(),
        board.getTitle(),
        board.getDescription(),
        board.getBackgroundColor(),
        board.getOwner().getId(),
        board.getOwner().getNickname(),
        boardMember.getRole(),
        board.getCreatedAt(),
        board.getUpdatedAt()
    );
  }
}