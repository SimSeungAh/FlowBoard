package com.example.flow_board.domain.board.dto.response;

import com.example.flow_board.domain.board.entity.BoardMember;
import com.example.flow_board.domain.board.entity.BoardRole;

import java.time.LocalDateTime;

public record BoardMemberResponse (
    Long id,
    Long boardId,
    Long userId,
    String email,
    String nickname,
    BoardRole role,
    LocalDateTime createAt,
    LocalDateTime updateAt
) {

  public  static BoardMemberResponse from(BoardMember boardMember) {
    return new BoardMemberResponse(
        boardMember.getId(),
        boardMember.getBoard().getId(),
        boardMember.getUser().getId(),
        boardMember.getUser().getEmail(),
        boardMember.getUser().getNickname(),
        boardMember.getRole(),
        boardMember.getCreatedAt(),
        boardMember.getUpdatedAt()
    );
  }
}
