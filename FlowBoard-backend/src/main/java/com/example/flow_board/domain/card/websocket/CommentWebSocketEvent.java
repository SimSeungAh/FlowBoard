package com.example.flow_board.domain.card.websocket;

import com.example.flow_board.domain.card.dto.response.CommentResponse;

import java.time.LocalDateTime;

public record CommentWebSocketEvent(
    CommentEventType type,
    Long boardId,
    Long cardId,
    Long commentId,
    CommentResponse comment,
    LocalDateTime occurredAt
) {

  /**
   * 댓글 생성 이벤트
   */
  public static CommentWebSocketEvent created(
      Long boardId,
      CommentResponse comment
  ) {
    return new CommentWebSocketEvent(
        CommentEventType.CREATED,
        boardId,
        comment.cardId(),
        comment.id(),
        comment,
        LocalDateTime.now()
    );
  }

  /**
   * 댓글 수정 이벤트
   */
  public static CommentWebSocketEvent updated(
      Long boardId,
      CommentResponse comment
  ) {
    return new CommentWebSocketEvent(
        CommentEventType.UPDATED,
        boardId,
        comment.cardId(),
        comment.id(),
        comment,
        LocalDateTime.now()
    );
  }

  /**
   * 댓글 삭제 이벤트
   */
  public static CommentWebSocketEvent deleted(
      Long boardId,
      Long cardId,
      Long commentId
  ) {
    return new CommentWebSocketEvent(
        CommentEventType.DELETED,
        boardId,
        cardId,
        commentId,
        null,
        LocalDateTime.now()
    );
  }
}