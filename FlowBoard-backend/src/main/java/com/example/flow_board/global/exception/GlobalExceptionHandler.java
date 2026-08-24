package com.example.flow_board.global.exception;

import com.example.flow_board.global.response.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

  @ExceptionHandler(CustomException.class)
  public ResponseEntity<ApiResponse<Void>> handleCustomException(
      CustomException e
  ) {
    ErrorCode errorCode =
        e.getErrorCode();

    log.warn(
        "비즈니스 예외 발생: code={}, status={}, message={}",
        errorCode.getCode(),
        errorCode.getStatus(),
        errorCode.getMessage()
    );

    return ResponseEntity
        .status(errorCode.getStatus())
        .body(
            ApiResponse.fail(
                errorCode.getCode(),
                errorCode.getMessage()
            )
        );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidationException(
      MethodArgumentNotValidException e
  ) {
    String message =
        e.getBindingResult()
            .getFieldErrors()
            .get(0)
            .getDefaultMessage();

    log.warn(
        "요청 값 검증 실패: {}",
        message
    );

    return ResponseEntity
        .badRequest()
        .body(
            ApiResponse.fail(
                ErrorCode.INVALID_INPUT.getCode(),
                message
            )
        );
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<Void>>
  handleHttpMessageNotReadableException(
      HttpMessageNotReadableException e
  ) {
    log.warn(
        "요청 본문을 읽을 수 없습니다.",
        e
    );

    return ResponseEntity
        .badRequest()
        .body(
            ApiResponse.fail(
                ErrorCode.INVALID_INPUT.getCode(),
                "요청 값의 형식이 올바르지 않습니다."
            )
        );
  }

  /**
   * 예상하지 못한 서버 오류.
   *
   * 기존 코드에서는 500 응답만 반환하고
   * 실제 예외를 로그로 남기지 않아
   * 원인 파악이 불가능했습니다.
   */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleException(
      Exception e
  ) {
    log.error(
        "처리되지 않은 서버 예외가 발생했습니다.",
        e
    );

    return ResponseEntity
        .internalServerError()
        .body(
            ApiResponse.fail(
                ErrorCode.INTERNAL_SERVER_ERROR.getCode(),
                ErrorCode.INTERNAL_SERVER_ERROR.getMessage()
            )
        );
  }
}