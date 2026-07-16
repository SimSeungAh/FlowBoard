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
public class CommentWebSocketEventListener {

  private static final String COMMENT_TOPIC_PREFIX =
      "/topic/boards/";

  private static final String COMMENT_TOPIC_SUFFIX =
      "/comments";

  private final SimpMessagingTemplate messagingTemplate;

  /**
   * 댓글 관련 DB 트랜잭션이 정상 커밋된 뒤
   * 해당 보드의 WebSocket 구독자에게 이벤트를 전송합니다.
   */
  @TransactionalEventListener(
      phase = TransactionPhase.AFTER_COMMIT
  )
  public void handleCommentEvent(
      CommentWebSocketEvent event
  ) {
    String destination =
        COMMENT_TOPIC_PREFIX
            + event.boardId()
            + COMMENT_TOPIC_SUFFIX;

    try {
      messagingTemplate.convertAndSend(
          destination,
          event
      );

      log.debug(
          "댓글 WebSocket 이벤트 전송 성공: type={}, boardId={}, cardId={}, commentId={}",
          event.type(),
          event.boardId(),
          event.cardId(),
          event.commentId()
      );
    } catch (RuntimeException e) {
      /*
       * DB 트랜잭션은 이미 정상 커밋된 상태이므로,
       * WebSocket 전송 실패 때문에 댓글 REST 요청까지
       * 실패한 것처럼 처리하지 않고 로그만 남깁니다.
       */
      log.error(
          "댓글 WebSocket 이벤트 전송 실패: type={}, boardId={}, cardId={}, commentId={}",
          event.type(),
          event.boardId(),
          event.cardId(),
          event.commentId(),
          e
      );
    }
  }
}