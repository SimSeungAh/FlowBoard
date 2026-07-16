package com.example.flow_board.domain.card.websocket;

import com.example.flow_board.domain.card.dto.response.CardResponse;

import java.time.LocalDateTime;

public record CardWebSocketEvent(
    CardEventType type,
    Long boardId,
    Long cardId,
    CardResponse card,
    LocalDateTime occurredAt
) {

  public static CardWebSocketEvent created(
      Long boardId,
      CardResponse card
  ) {
    return new CardWebSocketEvent(
        CardEventType.CREATED,
        boardId,
        card.id(),
        card,
        LocalDateTime.now()
    );
  }

  public static CardWebSocketEvent updated(
      Long boardId,
      CardResponse card
  ) {
    return new CardWebSocketEvent(
        CardEventType.UPDATED,
        boardId,
        card.id(),
        card,
        LocalDateTime.now()
    );
  }

  public static CardWebSocketEvent moved(
      Long boardId,
      CardResponse card
  ) {
    return new CardWebSocketEvent(
        CardEventType.MOVED,
        boardId,
        card.id(),
        card,
        LocalDateTime.now()
    );
  }

  public static CardWebSocketEvent deleted(
      Long boardId,
      Long cardId
  ) {
    return new CardWebSocketEvent(
        CardEventType.DELETED,
        boardId,
        cardId,
        null,
        LocalDateTime.now()
    );
  }
}