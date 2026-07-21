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
   * 화이트보드 관련 DB 트랜잭션이 정상 커밋된 뒤 해당 보드의 WebSocket 구독자에게 이벤트를 전송
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
    } catch (RuntimeException e) {
      /*
       * DB 트랜잭션은 이미 정상 커밋된 상태
       * WebSocket 전송 실패 때문에 REST 요청까지 실패한 것처럼 처리하지 않고 로그만 남김
       */
      log.error(
          "화이트보드 WebSocket 이벤트 전송 실패: type={}, boardId={}, strokeId={}",
          event.type(),
          event.boardId(),
          event.strokeId(),
          e
      );
    }
  }
}