package com.example.flow_board.domain.whiteboard.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WhiteboardEventPublisher {

  private final ApplicationEventPublisher applicationEventPublisher;

  /**
   * 화이트보드 변경 이벤트를 Spring 내부 이벤트로 발행
   * 실제 WebSocket 전송은 WhiteboardWebSocketEventListener에서 트랜잭션 커밋 후 처리
   */
  public void publish(
      WhiteboardWebSocketEvent event
  ) {
    applicationEventPublisher.publishEvent(
        event
    );
  }
}