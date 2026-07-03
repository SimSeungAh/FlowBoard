package com.example.backend_template.domain.user.controller;

import com.example.backend_template.global.security.service.CustomUserDetails;
import com.example.backend_template.domain.user.dto.response.UserResponse;
import com.example.backend_template.global.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "User", description = "회원 API")
public class UserController {

  @GetMapping("/me")
  @Operation(summary = "내 정보 조회", description = "현재 로그인한 사용자의 정보를 조회합니다.")
  public ApiResponse<UserResponse> getMyInfo(
      @AuthenticationPrincipal CustomUserDetails userDetails
  ) {
    return ApiResponse.success(
        "내 정보 조회 성공",
        UserResponse.from(userDetails.getUser())
    );
  }
}