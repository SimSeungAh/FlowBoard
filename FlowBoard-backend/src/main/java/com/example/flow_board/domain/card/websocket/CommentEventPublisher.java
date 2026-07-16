package com.example.flow_board.domain.card.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CommentEventPublisher {

  private final ApplicationEventPublisher applicationEventPublisher;

  /**
   * 댓글 변경 이벤트를 Spring 내부 이벤트로 발행합니다.
   *
   * 실제 WebSocket 전송은
   * CommentWebSocketEventListener에서
   * 트랜잭션 커밋 후 처리합니다.
   */
  public void publish(CommentWebSocketEvent event) {
    applicationEventPublisher.publishEvent(event);
  }
}