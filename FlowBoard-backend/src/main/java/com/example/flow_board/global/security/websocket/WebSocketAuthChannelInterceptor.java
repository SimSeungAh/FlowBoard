package com.example.flow_board.global.security.websocket;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import com.example.flow_board.global.security.jwt.JwtProvider;
import com.example.flow_board.global.security.service.CustomUserDetails;
import com.example.flow_board.global.security.service.CustomUserDetailsService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor
    implements ChannelInterceptor {

  private static final String AUTHORIZATION_HEADER =
      "Authorization";

  private static final String BEARER_PREFIX =
      "Bearer ";

  /**
   * 허용하는 보드 WebSocket 구독 주소
   *
   * /topic/boards/{boardId}/cards
   * /topic/boards/{boardId}/comments
   * /topic/boards/{boardId}/whiteboard
   * /topic/boards/{boardId}/whiteboards/{whiteboardId}
   */
  private static final Pattern BOARD_TOPIC_PATTERN =
      Pattern.compile(
          "^/topic/boards/(\\d+)/(cards|comments|whiteboard|whiteboards/\\d+)$"
      );

  private final JwtProvider jwtProvider;

  private final CustomUserDetailsService customUserDetailsService;

  private final BoardRepository boardRepository;

  private final BoardPermissionService boardPermissionService;

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
        accessor == null
            || accessor.getCommand() == null
    ) {
      return message;
    }

    /*
     * WebSocket 최초 연결
     */
    if (
        StompCommand.CONNECT.equals(
            accessor.getCommand()
        )
    ) {
      authenticate(
          accessor
      );
    }

    /*
     * Topic 구독
     */
    if (
        StompCommand.SUBSCRIBE.equals(
            accessor.getCommand()
        )
    ) {
      authorizeSubscription(
          accessor
      );
    }

    return message;
  }

  /**
   * CONNECT 시 JWT 인증
   */
  private void authenticate(
      StompHeaderAccessor accessor
  ) {
    String token =
        resolveToken(
            accessor
        );

    jwtProvider.validateToken(
        token
    );

    String email =
        jwtProvider.getEmail(
            token
        );

    UserDetails userDetails =
        customUserDetailsService
            .loadUserByUsername(
                email
            );

    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(
            userDetails,
            null,
            userDetails.getAuthorities()
        );

    /*
     * 인증 정보를 WebSocket 세션에 저장합니다.
     */
    accessor.setUser(
        authentication
    );
  }

  /**
   * SUBSCRIBE 권한 확인
   *
   * OWNER / MEMBER / VIEWER 모두
   * 실시간 데이터를 조회할 수 있습니다.
   */
  private void authorizeSubscription(
      StompHeaderAccessor accessor
  ) {
    String destination =
        accessor.getDestination();

    if (destination == null) {
      throw new AccessDeniedException(
          "WebSocket 구독 주소가 없습니다."
      );
    }

    Matcher matcher =
        BOARD_TOPIC_PATTERN.matcher(
            destination
        );

    if (!matcher.matches()) {
      throw new AccessDeniedException(
          "허용되지 않은 WebSocket 구독 주소입니다."
      );
    }

    Long boardId;

    try {
      boardId =
          Long.valueOf(
              matcher.group(1)
          );

    } catch (NumberFormatException exception) {
      throw new AccessDeniedException(
          "올바르지 않은 보드 ID입니다."
      );
    }

    CustomUserDetails userDetails =
        getAuthenticatedUser(
            accessor
        );

    Board board =
        boardRepository
            .findById(
                boardId
            )
            .orElseThrow(
                () -> new CustomException(
                    ErrorCode.BOARD_NOT_FOUND
                )
            );

    /*
     * OWNER / MEMBER / VIEWER는 모두
     * WebSocket 구독 가능.
     *
     * 보드에 참여하지 않은 사용자는 차단.
     */
    boardPermissionService
        .validateReadPermission(
            board,
            userDetails.getUser()
        );
  }

  /**
   * WebSocket 세션에서 인증 사용자 조회
   */
  private CustomUserDetails getAuthenticatedUser(
      StompHeaderAccessor accessor
  ) {
    if (
        !(accessor.getUser()
            instanceof Authentication authentication)
    ) {
      throw new BadCredentialsException(
          "WebSocket 인증 정보가 없습니다."
      );
    }

    Object principal =
        authentication.getPrincipal();

    if (
        !(principal
            instanceof CustomUserDetails userDetails)
    ) {
      throw new BadCredentialsException(
          "WebSocket 사용자 정보를 확인할 수 없습니다."
      );
    }

    return userDetails;
  }

  /**
   * STOMP CONNECT 헤더의 JWT 추출
   */
  private String resolveToken(
      StompHeaderAccessor accessor
  ) {
    String bearerToken =
        accessor.getFirstNativeHeader(
            AUTHORIZATION_HEADER
        );

    if (
        bearerToken == null
            || !bearerToken.startsWith(
            BEARER_PREFIX
        )
    ) {
      throw new BadCredentialsException(
          "WebSocket 인증 토큰이 없습니다."
      );
    }

    String token =
        bearerToken.substring(
            BEARER_PREFIX.length()
        );

    if (token.isBlank()) {
      throw new BadCredentialsException(
          "WebSocket 인증 토큰이 비어 있습니다."
      );
    }

    return token;
  }
}