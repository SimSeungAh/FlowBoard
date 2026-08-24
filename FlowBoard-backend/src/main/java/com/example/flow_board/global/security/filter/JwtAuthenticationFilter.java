package com.example.flow_board.global.security.filter;

import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.jwt.JwtProvider;
import com.example.flow_board.global.security.service.CustomUserDetailsService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

  private final JwtProvider jwtProvider;

  private final CustomUserDetailsService customUserDetailsService;

  /*
   * Spring Security Filter는
   * @RestControllerAdvice의 처리 범위보다 앞에서 실행됩니다.
   *
   * 따라서 JWT 검증 중 발생하는 CustomException은
   * 이 Filter 안에서 직접 HTTP 응답으로 변환합니다.
   */
  private final ObjectMapper objectMapper =
      new ObjectMapper();

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {

    String token =
        resolveToken(
            request
        );

    /*
     * Authorization 헤더가 없는 요청은
     * SecurityFilterChain의 인증 정책에 맡깁니다.
     *
     * permitAll 경로는 그대로 통과하고,
     * 보호된 경로는 AuthenticationEntryPoint에서
     * 401 응답을 처리합니다.
     */
    if (token == null) {
      filterChain.doFilter(
          request,
          response
      );

      return;
    }

    try {
      /*
       * 1. Access Token 검증
       *
       * 만료:
       * TOKEN_002 / HTTP 401
       *
       * 잘못된 Token:
       * TOKEN_001 / HTTP 401
       */
      jwtProvider.validateToken(
          token
      );

      /*
       * 2. Token에서 사용자 이메일 추출
       */
      String email =
          jwtProvider.getEmail(
              token
          );

      /*
       * 3. 현재 DB의 사용자 조회
       */
      UserDetails userDetails =
          customUserDetailsService
              .loadUserByUsername(
                  email
              );

      /*
       * 4. Spring Security 인증 객체 생성
       */
      UsernamePasswordAuthenticationToken authentication =
          new UsernamePasswordAuthenticationToken(
              userDetails,
              null,
              userDetails.getAuthorities()
          );

      /*
       * 5. SecurityContext에 현재 사용자 저장
       *
       * 이후 Controller의
       *
       * @AuthenticationPrincipal CustomUserDetails
       *
       * 로 정상 접근할 수 있습니다.
       */
      SecurityContextHolder
          .getContext()
          .setAuthentication(
              authentication
          );

      /*
       * 인증 성공 시 다음 Filter로 이동합니다.
       */
      filterChain.doFilter(
          request,
          response
      );

    } catch (
        CustomException exception
    ) {
      /*
       * 중요:
       *
       * JWT 관련 예외는 Controller까지 도달하기 전에
       * 이 Filter에서 발생합니다.
       *
       * 따라서 GlobalExceptionHandler가 아니라
       * 여기서 직접 올바른 HTTP 상태를 반환해야 합니다.
       */
      SecurityContextHolder.clearContext();

      writeCustomExceptionResponse(
          response,
          exception
      );
    }
  }

  /**
   * JWT 관련 CustomException을
   * FlowBoard 공통 ApiResponse 형식으로 반환합니다.
   *
   * 예:
   *
   * HTTP 401
   *
   * {
   *   "success": false,
   *   "code": "TOKEN_002",
   *   "message": "만료된 토큰입니다.",
   *   "data": null
   * }
   *
   * 프론트 Axios interceptor는 HTTP 401을 감지해서
   * Refresh Token으로 Access Token을 자동 재발급합니다.
   */
  private void writeCustomExceptionResponse(
      HttpServletResponse response,
      CustomException exception
  ) throws IOException {

    ErrorCode errorCode =
        exception.getErrorCode();

    response.setStatus(
        errorCode
            .getStatus()
            .value()
    );

    response.setCharacterEncoding(
        "UTF-8"
    );

    response.setContentType(
        "application/json;charset=UTF-8"
    );

    ApiResponse<Void> apiResponse =
        ApiResponse.fail(
            errorCode.getCode(),
            errorCode.getMessage()
        );

    objectMapper.writeValue(
        response.getWriter(),
        apiResponse
    );
  }

  /**
   * Authorization 헤더에서
   *
   * Bearer {accessToken}
   *
   * 형태의 Access Token을 추출합니다.
   */
  private String resolveToken(
      HttpServletRequest request
  ) {

    String bearerToken =
        request.getHeader(
            "Authorization"
        );

    if (
        bearerToken != null
            && bearerToken.startsWith(
            "Bearer "
        )
    ) {
      String token =
          bearerToken.substring(
              7
          );

      if (!token.isBlank()) {
        return token;
      }
    }

    return null;
  }
}