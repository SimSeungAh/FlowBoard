package com.example.flow_board.domain.card.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class CardWebSocketEventListener {

  private static final String CARD_TOPIC_PREFIX =
      "/topic/boards/";

  private static final String CARD_TOPIC_SUFFIX =
      "/cards";

  private final SimpMessagingTemplate messagingTemplate;

  /**
   * 카드 관련 DB 트랜잭션이 정상 커밋된 뒤
   * WebSocket 구독자에게 이벤트를 전송합니다.
   */
  @TransactionalEventListener(
      phase = TransactionPhase.AFTER_COMMIT
  )
  public void handleCardEvent(
      CardWebSocketEvent event
  ) {
    String destination =
        CARD_TOPIC_PREFIX
            + event.boardId()
            + CARD_TOPIC_SUFFIX;

    try {
      messagingTemplate.convertAndSend(
          destination,
          event
      );

      log.debug(
          "카드 WebSocket 이벤트 전송 성공: type={}, boardId={}, cardId={}",
          event.type(),
          event.boardId(),
          event.cardId()
      );
    } catch (RuntimeException e) {
      /*
       * DB 트랜잭션은 이미 커밋된 상태입니다.
       * WebSocket 전송 실패 때문에 REST 응답까지
       * 실패한 것처럼 처리하지 않고 로그만 남깁니다.
       */
      log.error(
          "카드 WebSocket 이벤트 전송 실패: type={}, boardId={}, cardId={}",
          event.type(),
          event.boardId(),
          event.cardId(),
          e
      );
    }
  }
}