package com.example.backend_template.global.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

  INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON_001", "잘못된 입력입니다."),
  UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "AUTH_001", "인증이 필요합니다."),
  FORBIDDEN(HttpStatus.FORBIDDEN, "AUTH_002", "접근 권한이 없습니다."),

  EMAIL_ALREADY_EXISTS(HttpStatus.BAD_REQUEST, "USER_001", "이미 사용 중인 이메일입니다."),
  USER_NOT_FOUND(HttpStatus.NOT_FOUND, "USER_002", "사용자를 찾을 수 없습니다."),
  PASSWORD_NOT_MATCH(HttpStatus.UNAUTHORIZED, "USER_003", "비밀번호가 일치하지 않습니다."),

  INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "SERVER_001", "서버 내부 오류가 발생했습니다."),
  INVALID_TOKEN(
      HttpStatus.UNAUTHORIZED,
    "TOKEN_001",
        "유효하지 않은 토큰입니다."
  ),

  EXPIRED_TOKEN(
      HttpStatus.UNAUTHORIZED,
    "TOKEN_002",
        "만료된 토큰입니다."
  ),

  UNSUPPORTED_TOKEN(
      HttpStatus.UNAUTHORIZED,
    "TOKEN_003",
        "지원하지 않는 토큰입니다."
  ),

  EMPTY_TOKEN(
      HttpStatus.UNAUTHORIZED,
    "TOKEN_004",
        "토큰이 존재하지 않습니다."
  );

  private final HttpStatus status;
  private final String code;
  private final String message;

  ErrorCode(HttpStatus status, String code, String message) {
    this.status = status;
    this.code = code;
    this.message = message;

  }

}