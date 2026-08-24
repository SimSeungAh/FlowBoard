package com.example.flow_board.global.security.handler;

import com.example.flow_board.global.response.ApiResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Slf4j
@Component
public class JwtAuthenticationEntryPoint
    implements AuthenticationEntryPoint {

  private final ObjectMapper objectMapper =
      new ObjectMapper();

  @Override
  public void commence(
      HttpServletRequest request,
      HttpServletResponse response,
      AuthenticationException authException
  ) throws IOException, ServletException {

    /*
     * 실제 Controller/Service 오류가 발생한 뒤
     * Spring Boot가 /error dispatch를 수행하는 과정에서
     * Security가 다시 인증 오류로 덮어쓰는 현상을 구분합니다.
     */
    if (
        request.getDispatcherType()
            == DispatcherType.ERROR
    ) {
      Object exceptionAttribute =
          request.getAttribute(
              RequestDispatcher.ERROR_EXCEPTION
          );

      Object statusAttribute =
          request.getAttribute(
              RequestDispatcher.ERROR_STATUS_CODE
          );

      Object requestUriAttribute =
          request.getAttribute(
              RequestDispatcher.ERROR_REQUEST_URI
          );

      if (
          exceptionAttribute instanceof Throwable throwable
      ) {
        log.error(
            "ERROR dispatch 중 실제 서버 예외 발생: uri={}, status={}",
            requestUriAttribute,
            statusAttribute,
            throwable
        );

      } else {
        log.error(
            "ERROR dispatch가 Security 인증 오류로 전달됨: uri={}, status={}",
            requestUriAttribute,
            statusAttribute
        );
      }

      response.setStatus(
          HttpServletResponse.SC_INTERNAL_SERVER_ERROR
      );

      response.setCharacterEncoding(
          "UTF-8"
      );

      response.setContentType(
          "application/json;charset=UTF-8"
      );

      ApiResponse<Void> apiResponse =
          ApiResponse.fail(
              "SERVER_001",
              "서버 내부 오류가 발생했습니다."
          );

      objectMapper.writeValue(
          response.getWriter(),
          apiResponse
      );

      return;
    }

    /*
     * 진짜 인증되지 않은 일반 요청.
     */
    log.warn(
        "인증되지 않은 요청: method={}, uri={}",
        request.getMethod(),
        request.getRequestURI()
    );

    response.setStatus(
        HttpServletResponse.SC_UNAUTHORIZED
    );

    response.setCharacterEncoding(
        "UTF-8"
    );

    response.setContentType(
        "application/json;charset=UTF-8"
    );

    ApiResponse<Void> apiResponse =
        ApiResponse.fail(
            "AUTH_001",
            "인증이 필요합니다."
        );

    objectMapper.writeValue(
        response.getWriter(),
        apiResponse
    );
  }
}