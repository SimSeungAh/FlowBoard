package com.example.flow_board.domain.user.controller;

import com.example.flow_board.domain.user.dto.request.LoginRequest;
import com.example.flow_board.domain.user.dto.request.LogoutRequest;
import com.example.flow_board.domain.user.dto.request.SignupRequest;
import com.example.flow_board.domain.user.dto.request.TokenRefreshRequest;
import com.example.flow_board.domain.user.dto.response.TokenResponse;
import com.example.flow_board.domain.user.service.AuthService;
import com.example.flow_board.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "회원 인증 API")
public class AuthController {

  private final AuthService authService;
  @Operation(summary = "회원가입", description = "이메일, 비밀번호, 닉네임으로 회원가입합니다.")
  @PostMapping("/signup")
  public ApiResponse<Void> signup(@Valid @RequestBody SignupRequest request) {
    authService.signup(request);
    return ApiResponse.success("회원가입이 완료되었습니다.");
  }

  @Operation(summary = "로그인", description = "로그인 후 Access Token과 Refresh Token을 발급합니다.")
  @PostMapping("/login")
  public ApiResponse<TokenResponse> login(@Valid @RequestBody LoginRequest request) {
    TokenResponse tokenResponse = authService.login(request);
    return ApiResponse.success("로그인에 성공했습니다.", tokenResponse);
  }

  @Operation(summary = "로그아웃", description = "Refresh Token을 삭제하여 로그아웃합니다.")
  @PostMapping("/logout")
  public ApiResponse<Void> logout(@Valid @RequestBody LogoutRequest request) {
    authService.logout(request);
    return ApiResponse.success("로그아웃되었습니다.");
  }

  @Operation(summary = "토큰 재발급", description = "Refresh Token으로 새로운 Access Token과 Refresh Token을 발급합니다.")
  @PostMapping("/reissue")
  public ApiResponse<TokenResponse> reissue(
      @Valid @RequestBody TokenRefreshRequest request
  ) {
    TokenResponse tokenResponse = authService.reissue(request);
    return ApiResponse.success("토큰이 재발급되었습니다.", tokenResponse);
  }
}