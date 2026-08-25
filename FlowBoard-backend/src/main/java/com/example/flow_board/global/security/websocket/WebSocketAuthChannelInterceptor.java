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
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

  private static final String AUTHORIZATION_HEADER = "Authorization";
  private static final String BEARER_PREFIX = "Bearer ";

  private static final Pattern BOARD_TOPIC_PATTERN = Pattern.compile(
      "^/topic/boards/(\\d+)/(cards|comments|whiteboard|whiteboards/\\d+)$"
  );

  private static final Pattern WHITEBOARD_OBJECT_LIVE_SEND_PATTERN = Pattern.compile(
      "^/app/boards/(\\d+)/whiteboards/(\\d+)/objects/(\\d+)/(live-edit|live-move|live-resize)$"
  );

  private static final Pattern WHITEBOARD_STROKE_LIVE_SEND_PATTERN = Pattern.compile(
      "^/app/boards/(\\d+)/whiteboards/(\\d+)/strokes/(live-start|live-append|live-end)$"
  );

  private static final Pattern WHITEBOARD_CURSOR_SEND_PATTERN = Pattern.compile(
      "^/app/boards/(\\d+)/whiteboards/(\\d+)/cursor$"
  );

  private final JwtProvider jwtProvider;
  private final CustomUserDetailsService customUserDetailsService;
  private final BoardRepository boardRepository;
  private final BoardPermissionService boardPermissionService;

  @Override
  public Message<?> preSend(Message<?> message, MessageChannel channel) {
    StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(
        message,
        StompHeaderAccessor.class
    );

    if (accessor == null || accessor.getCommand() == null) {
      return message;
    }

    if (StompCommand.CONNECT.equals(accessor.getCommand())) {
      authenticate(accessor);
    }

    if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
      authorizeSubscription(accessor);
    }

    if (StompCommand.SEND.equals(accessor.getCommand())) {
      authorizeSend(accessor);
    }

    return message;
  }

  private void authenticate(StompHeaderAccessor accessor) {
    String token = resolveToken(accessor);
    jwtProvider.validateToken(token);
    String email = jwtProvider.getEmail(token);

    UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);
    UsernamePasswordAuthenticationToken authentication =
        new UsernamePasswordAuthenticationToken(
            userDetails,
            null,
            userDetails.getAuthorities()
        );

    accessor.setUser(authentication);
  }

  private void authorizeSubscription(StompHeaderAccessor accessor) {
    String destination = accessor.getDestination();

    if (destination == null) {
      throw new AccessDeniedException("WebSocket 구독 주소가 없습니다.");
    }

    Matcher matcher = BOARD_TOPIC_PATTERN.matcher(destination);

    if (!matcher.matches()) {
      throw new AccessDeniedException("허용되지 않은 WebSocket 구독 주소입니다.");
    }

    Long boardId = parseBoardId(matcher.group(1));
    CustomUserDetails userDetails = getAuthenticatedUser(accessor);
    Board board = getBoardById(boardId);

    boardPermissionService.validateReadPermission(board, userDetails.getUser());
  }

  private void authorizeSend(StompHeaderAccessor accessor) {
    String destination = accessor.getDestination();

    if (destination == null) {
      throw new AccessDeniedException("WebSocket 전송 주소가 없습니다.");
    }

    CustomUserDetails userDetails = getAuthenticatedUser(accessor);

    Matcher cursorMatcher = WHITEBOARD_CURSOR_SEND_PATTERN.matcher(destination);
    if (cursorMatcher.matches()) {
      Board board = getBoardById(parseBoardId(cursorMatcher.group(1)));
      boardPermissionService.validateReadPermission(board, userDetails.getUser());
      return;
    }

    Long writableBoardId = extractWritableBoardId(destination);
    if (writableBoardId == null) {
      throw new AccessDeniedException("허용되지 않은 WebSocket 전송 주소입니다.");
    }

    Board board = getBoardById(writableBoardId);
    boardPermissionService.validateWritePermission(board, userDetails.getUser());
  }

  private Long extractWritableBoardId(String destination) {
    Matcher objectMatcher = WHITEBOARD_OBJECT_LIVE_SEND_PATTERN.matcher(destination);
    if (objectMatcher.matches()) {
      return parseBoardId(objectMatcher.group(1));
    }

    Matcher strokeMatcher = WHITEBOARD_STROKE_LIVE_SEND_PATTERN.matcher(destination);
    if (strokeMatcher.matches()) {
      return parseBoardId(strokeMatcher.group(1));
    }

    return null;
  }

  private Long parseBoardId(String value) {
    try {
      return Long.valueOf(value);
    } catch (NumberFormatException exception) {
      throw new AccessDeniedException("올바르지 않은 보드 ID입니다.");
    }
  }

  private Board getBoardById(Long boardId) {
    return boardRepository
        .findById(boardId)
        .orElseThrow(() -> new CustomException(ErrorCode.BOARD_NOT_FOUND));
  }

  private CustomUserDetails getAuthenticatedUser(StompHeaderAccessor accessor) {
    if (!(accessor.getUser() instanceof Authentication authentication)) {
      throw new BadCredentialsException("WebSocket 인증 정보가 없습니다.");
    }

    Object principal = authentication.getPrincipal();
    if (!(principal instanceof CustomUserDetails userDetails)) {
      throw new BadCredentialsException("WebSocket 사용자 정보를 확인할 수 없습니다.");
    }

    return userDetails;
  }

  private String resolveToken(StompHeaderAccessor accessor) {
    String bearerToken = accessor.getFirstNativeHeader(AUTHORIZATION_HEADER);

    if (bearerToken == null || !bearerToken.startsWith(BEARER_PREFIX)) {
      throw new BadCredentialsException("WebSocket 인증 토큰이 없습니다.");
    }

    String token = bearerToken.substring(BEARER_PREFIX.length());
    if (token.isBlank()) {
      throw new BadCredentialsException("WebSocket 인증 토큰이 비어 있습니다.");
    }

    return token;
  }
}
