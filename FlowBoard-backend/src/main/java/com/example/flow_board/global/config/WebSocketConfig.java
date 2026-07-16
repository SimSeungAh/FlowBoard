package com.example.flow_board.global.config;

import com.example.flow_board.global.security.websocket.WebSocketAuthChannelInterceptor;
import com.example.flow_board.global.security.websocket.WebSocketErrorHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig
    implements WebSocketMessageBrokerConfigurer {

  private final WebSocketAuthChannelInterceptor
      webSocketAuthChannelInterceptor;

  private final WebSocketErrorHandler
      webSocketErrorHandler;

  /**
   * STOMP 메시지 경로 설정
   */
  @Override
  public void configureMessageBroker(
      MessageBrokerRegistry registry
  ) {
    /*
     * 서버가 클라이언트에게 메시지를 보내는 경로
     *
     * 예:
     * /topic/boards/1/cards
     */
    registry.enableSimpleBroker("/topic");

    /*
     * 클라이언트가 @MessageMapping 메서드로
     * 메시지를 보낼 때 사용하는 접두사
     */
    registry.setApplicationDestinationPrefixes("/app");
  }

  /**
   * WebSocket 최초 연결 주소 및 오류 처리 설정
   */
  @Override
  public void registerStompEndpoints(
      StompEndpointRegistry registry
  ) {
    /*
     * CONNECT, SUBSCRIBE 처리 중 발생한 예외를
     * STOMP ERROR 프레임으로 변환합니다.
     */
    registry.setErrorHandler(
        webSocketErrorHandler
    );

    /*
     * React WebSocket 연결 주소:
     * ws://localhost:8080/ws
     */
    registry.addEndpoint("/ws")
        .setAllowedOriginPatterns(
            "http://localhost:*",
            "http://127.0.0.1:*"
        );
  }

  /**
   * 클라이언트에서 들어오는 STOMP 메시지에
   * JWT 인증 및 구독 권한 인터셉터를 적용합니다.
   */
  @Override
  public void configureClientInboundChannel(
      ChannelRegistration registration
  ) {
    registration.interceptors(
        webSocketAuthChannelInterceptor
    );
  }
}