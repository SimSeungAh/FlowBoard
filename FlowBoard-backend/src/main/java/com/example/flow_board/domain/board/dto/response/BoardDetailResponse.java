package com.example.flow_board.domain.board.dto.response;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardRole;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 보드 상세 조회 응답
 * 로그인한 사용자의 보드 역할을 함께 반환하여 프론트엔드에서 기능별 권한을 구분할 수 있게 함
 */
public record BoardDetailResponse(
    Long id,
    String title,
    String description,
    String backgroundColor,
    Long ownerId,
    String ownerNickname,
    BoardRole myRole,
    List<BoardColumnResponse> columns,
    LocalDateTime createdAt,
    LocalDateTime updatedAt
) {

  public static BoardDetailResponse from(
      Board board,
      BoardRole myRole,
      List<BoardColumnResponse> columns
  ) {
    return new BoardDetailResponse(
        board.getId(),
        board.getTitle(),
        board.getDescription(),
        board.getBackgroundColor(),
        board.getOwner().getId(),
        board.getOwner().getNickname(),
        myRole,
        List.copyOf(columns),
        board.getCreatedAt(),
        board.getUpdatedAt()
    );
  }
}