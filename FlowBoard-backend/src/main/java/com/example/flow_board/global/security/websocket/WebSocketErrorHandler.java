package com.example.flow_board.global.security.websocket;

import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.StompSubProtocolErrorHandler;

import java.nio.charset.StandardCharsets;

@Slf4j
@Component
public class WebSocketErrorHandler
    extends StompSubProtocolErrorHandler {

  /**
   * WebSocket/STOMP 메시지 처리 중 발생한 예외를
   * STOMP ERROR 프레임으로 변환합니다.
   */
  @Override
  public Message<byte[]> handleClientMessageProcessingError(
      Message<byte[]> clientMessage,
      Throwable exception
  ) {
    Throwable cause = findRelevantCause(exception);
    ErrorCode errorCode = resolveErrorCode(cause);

    if (errorCode == ErrorCode.INTERNAL_SERVER_ERROR) {
      log.error(
          "WebSocket 메시지 처리 중 서버 오류가 발생했습니다.",
          exception
      );
    } else {
      log.warn(
          "WebSocket 요청 거부: code={}, message={}",
          errorCode.getCode(),
          errorCode.getMessage()
      );
    }

    String body = createErrorBody(errorCode);

    StompHeaderAccessor accessor =
        StompHeaderAccessor.create(StompCommand.ERROR);

    accessor.setMessage(errorCode.getMessage());
    accessor.setNativeHeader(
        "content-type",
        "application/json;charset=UTF-8"
    );
    accessor.setLeaveMutable(true);

    return MessageBuilder.createMessage(
        body.getBytes(StandardCharsets.UTF_8),
        accessor.getMessageHeaders()
    );
  }

  /**
   * Spring Messaging 예외 안에 감싸진 실제 예외를 찾습니다.
   */
  private Throwable findRelevantCause(
      Throwable exception
  ) {
    Throwable current = exception;

    while (current != null) {
      if (
          current instanceof CustomException ||
              current instanceof BadCredentialsException ||
              current instanceof AccessDeniedException
      ) {
        return current;
      }

      current = current.getCause();
    }

    return exception;
  }

  /**
   * 예외 종류에 맞는 공통 ErrorCode를 결정합니다.
   */
  private ErrorCode resolveErrorCode(
      Throwable exception
  ) {
    if (exception instanceof CustomException customException) {
      return customException.getErrorCode();
    }

    if (exception instanceof BadCredentialsException) {
      return ErrorCode.UNAUTHORIZED;
    }

    if (exception instanceof AccessDeniedException) {
      return ErrorCode.FORBIDDEN;
    }

    return ErrorCode.INTERNAL_SERVER_ERROR;
  }

  /**
   * 기존 REST ApiResponse와 비슷한 JSON 형태를 만듭니다.
   */
  private String createErrorBody(
      ErrorCode errorCode
  ) {
    return """
        {
          "success": false,
          "code": "%s",
          "message": "%s",
          "data": null
        }
        """.formatted(
        escapeJson(errorCode.getCode()),
        escapeJson(errorCode.getMessage())
    );
  }

  /**
   * JSON 문자열에 포함되면 문제가 되는 문자를 변환합니다.
   */
  private String escapeJson(
      String value
  ) {
    if (value == null) {
      return "";
    }

    return value
        .replace("\\", "\\\\")
        .replace("\"", "\\\"")
        .replace("\r", "\\r")
        .replace("\n", "\\n")
        .replace("\t", "\\t");
  }
}