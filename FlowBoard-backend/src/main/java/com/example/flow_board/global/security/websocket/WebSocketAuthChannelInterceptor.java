package com.example.flow_board.global.security.websocket;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
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
   * 허용하는 보드 WebSocket 구독 주소입니다.
   *
   * 카드:
   * /topic/boards/1/cards
   *
   * 댓글:
   * /topic/boards/1/comments
   */
  private static final Pattern BOARD_TOPIC_PATTERN =
      Pattern.compile(
          "^/topic/boards/(\\d+)/(cards|comments)$"
      );

  private final JwtProvider jwtProvider;

  private final CustomUserDetailsService
      customUserDetailsService;

  private final BoardRepository boardRepository;

  private final BoardMemberRepository
      boardMemberRepository;

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
        accessor == null ||
            accessor.getCommand() == null
    ) {
      return message;
    }

    if (
        StompCommand.CONNECT.equals(
            accessor.getCommand()
        )
    ) {
      authenticate(accessor);
    }

    if (
        StompCommand.SUBSCRIBE.equals(
            accessor.getCommand()
        )
    ) {
      authorizeSubscription(accessor);
    }

    return message;
  }

  /**
   * WebSocket 최초 연결 시 JWT를 검사하고
   * 인증 정보를 WebSocket 세션에 저장합니다.
   */
  private void authenticate(
      StompHeaderAccessor accessor
  ) {
    String token = resolveToken(accessor);

    jwtProvider.validateToken(token);

    String email = jwtProvider.getEmail(token);

    UserDetails userDetails =
        customUserDetailsService.loadUserByUsername(
            email
        );

    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(
            userDetails,
            null,
            userDetails.getAuthorities()
        );

    accessor.setUser(authentication);
  }

  /**
   * 카드 또는 댓글 구독 시
   * 해당 사용자가 보드 멤버인지 확인합니다.
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
        BOARD_TOPIC_PATTERN.matcher(destination);

    /*
     * 허용 주소:
     *
     * /topic/boards/{boardId}/cards
     * /topic/boards/{boardId}/comments
     */
    if (!matcher.matches()) {
      throw new AccessDeniedException(
          "허용되지 않은 WebSocket 구독 주소입니다."
      );
    }

    Long boardId;

    try {
      boardId = Long.valueOf(
          matcher.group(1)
      );
    } catch (NumberFormatException e) {
      throw new AccessDeniedException(
          "올바르지 않은 보드 ID입니다."
      );
    }

    CustomUserDetails userDetails =
        getAuthenticatedUser(accessor);

    Board board = boardRepository
        .findById(boardId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_NOT_FOUND
            )
        );

    boolean isBoardMember =
        boardMemberRepository.existsByBoardAndUser(
            board,
            userDetails.getUser()
        );

    if (!isBoardMember) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }

  /**
   * WebSocket 세션의 인증 사용자 정보를 가져옵니다.
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
   * STOMP CONNECT 헤더에서 Access Token을 추출합니다.
   */
  private String resolveToken(
      StompHeaderAccessor accessor
  ) {
    String bearerToken =
        accessor.getFirstNativeHeader(
            AUTHORIZATION_HEADER
        );

    if (
        bearerToken == null ||
            !bearerToken.startsWith(BEARER_PREFIX)
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