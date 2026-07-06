package com.example.flow_board.global.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ApiResponse<T> {

  private boolean success;
  private String code;
  private String message;
  private T data;

  public static <T> ApiResponse<T> success(String message, T data) {
    return new ApiResponse<>(true, "SUCCESS", message, data);
  }

  public static ApiResponse<Void> success(String message) {
    return new ApiResponse<>(true, "SUCCESS", message, null);
  }

  public static ApiResponse<Void> fail(String code, String message) {
    return new ApiResponse<>(false, code, message, null);
  }
}