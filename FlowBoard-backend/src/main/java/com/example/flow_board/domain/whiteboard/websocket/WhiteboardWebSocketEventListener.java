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

  private static final String BOARD_TOPIC_PREFIX =
      "/topic/boards/";

  private static final String LEGACY_WHITEBOARD_SUFFIX =
      "/whiteboard";

  private static final String WORKSPACE_WHITEBOARD_PREFIX =
      "/whiteboards/";

  private final SimpMessagingTemplate messagingTemplate;

  /**
   * DB 작업이 정상 커밋된 후에만
   * WebSocket 이벤트를 전송합니다.
   *
   * 기존 이벤트:
   *
   * /topic/boards/{boardId}/whiteboard
   *
   * 신규 이벤트:
   *
   * /topic/boards/{boardId}/whiteboards/{whiteboardId}
   */
  @TransactionalEventListener(
      phase = TransactionPhase.AFTER_COMMIT
  )
  public void handleWhiteboardEvent(
      WhiteboardWebSocketEvent event
  ) {
    String destination =
        resolveDestination(
            event
        );

    try {
      messagingTemplate.convertAndSend(
          destination,
          event
      );

      log.debug(
          "화이트보드 WebSocket 이벤트 전송 성공: type={}, boardId={}, whiteboardId={}, strokeId={}, destination={}",
          event.type(),
          event.boardId(),
          event.whiteboardId(),
          event.strokeId(),
          destination
      );

    } catch (
        RuntimeException exception
    ) {
      /*
       * DB 트랜잭션은 이미 정상 커밋된 상태입니다.
       *
       * WebSocket 전송 실패 때문에
       * 이미 저장된 REST 요청까지 실패한 것으로
       * 처리하지 않습니다.
       */
      log.error(
          "화이트보드 WebSocket 이벤트 전송 실패: type={}, boardId={}, whiteboardId={}, strokeId={}, destination={}",
          event.type(),
          event.boardId(),
          event.whiteboardId(),
          event.strokeId(),
          destination,
          exception
      );
    }
  }

  private String resolveDestination(
      WhiteboardWebSocketEvent event
  ) {
    /*
     * whiteboardId가 없는 이벤트는
     * 아직 기존 프론트에서 발생한 요청입니다.
     */
    if (
        event.whiteboardId() == null
    ) {
      return BOARD_TOPIC_PREFIX
          + event.boardId()
          + LEGACY_WHITEBOARD_SUFFIX;
    }

    /*
     * 다중 화이트보드 신규 채널
     */
    return BOARD_TOPIC_PREFIX
        + event.boardId()
        + WORKSPACE_WHITEBOARD_PREFIX
        + event.whiteboardId();
  }
}