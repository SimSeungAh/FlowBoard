package com.example.flow_board.global.security.websocket;

import com.example.flow_board.global.security.jwt.JwtProvider;
import com.example.flow_board.global.security.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  private final JwtProvider jwtProvider;
  private final CustomUserDetailsService customUserDetailsService;

  @Override
  public Message<?> preSend(
      Message<?> message,
      MessageChannel channel
  ) {
    StompHeaderAccessor accessor =
        MessageHeaderAccessor.getAccessor(
            message,
            StompHeaderAccessor.class
        );

    if (
        accessor != null &&
            StompCommand.CONNECT.equals(accessor.getCommand())
    ) {
      String token = resolveToken(accessor);

      jwtProvider.validateToken(token);

      String email = jwtProvider.getEmail(token);

      UserDetails userDetails =
          customUserDetailsService.loadUserByUsername(email);

      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(
              userDetails,
              null,
              userDetails.getAuthorities()
          );

      accessor.setUser(authentication);
    }

    return message;
  }

  private String resolveToken(StompHeaderAccessor accessor) {
    String bearerToken =
        accessor.getFirstNativeHeader(AUTHORIZATION_HEADER);

    if (
        bearerToken == null ||
            !bearerToken.startsWith(BEARER_PREFIX)
    ) {
      throw new BadCredentialsException(
          "WebSocket 인증 토큰이 없습니다."
      );
    }

    return bearerToken.substring(BEARER_PREFIX.length());
  }
}