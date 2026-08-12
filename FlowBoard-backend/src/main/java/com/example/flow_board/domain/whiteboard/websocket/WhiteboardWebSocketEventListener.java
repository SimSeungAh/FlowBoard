package com.example.flow_board.domain.whiteboard.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Slf4j
@Component
@RequiredArgsConstructor
public class WhiteboardWebSocketEventListener {

  private static final String WHITEBOARD_TOPIC_PREFIX =
      "/topic/boards/";

  private static final String WHITEBOARD_TOPIC_SUFFIX =
      "/whiteboard";

  private final SimpMessagingTemplate messagingTemplate;

  /**
   * 화이트보드 DB 작업이 정상 커밋된 후
   * 해당 보드를 구독하고 있는 사용자에게
   * WebSocket 이벤트를 전달합니다.
   */
  @TransactionalEventListener(
      phase = TransactionPhase.AFTER_COMMIT
  )
  public void handleWhiteboardEvent(
      WhiteboardWebSocketEvent event
  ) {
    String destination =
        WHITEBOARD_TOPIC_PREFIX
            + event.boardId()
            + WHITEBOARD_TOPIC_SUFFIX;

    try {
      messagingTemplate.convertAndSend(
          destination,
          event
      );

      log.debug(
          "화이트보드 WebSocket 이벤트 전송 성공: type={}, boardId={}, strokeId={}",
          event.type(),
          event.boardId(),
          event.strokeId()
      );

    } catch (RuntimeException exception) {

      /*
       * DB 트랜잭션은 이미 정상적으로
       * 커밋된 상태입니다.
       *
       * WebSocket 전송 실패가 REST 요청 실패로
       * 이어지지 않도록 로그만 남깁니다.
       */
      log.error(
          "화이트보드 WebSocket 이벤트 전송 실패: type={}, boardId={}, strokeId={}",
          event.type(),
          event.boardId(),
          event.strokeId(),
          exception
      );
    }
  }
}