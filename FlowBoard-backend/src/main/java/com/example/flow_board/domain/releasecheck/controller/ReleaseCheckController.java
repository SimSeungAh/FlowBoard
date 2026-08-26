package com.example.flow_board.domain.releasecheck.controller;

import com.example.flow_board.domain.releasecheck.dto.ReleaseCheckResponse;
import com.example.flow_board.domain.releasecheck.dto.ReleaseCheckUpdateRequest;
import com.example.flow_board.domain.releasecheck.service.ReleaseCheckService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ReleaseCheckController {

  private final ReleaseCheckService releaseCheckService;

  @GetMapping("/api/cards/{cardId}/release-check")
  public ApiResponse<ReleaseCheckResponse> getReleaseCheck(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    return ApiResponse.success(
        "릴리즈 체크 상세 조회 성공",
        releaseCheckService.getReleaseCheck(userDetails.getUser(), cardId)
    );
  }

  @PatchMapping("/api/cards/{cardId}/release-check")
  public ApiResponse<ReleaseCheckResponse> updateReleaseCheck(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @RequestBody ReleaseCheckUpdateRequest request
  ) {
    return ApiResponse.success(
        "릴리즈 체크 정보 변경 성공",
        releaseCheckService.updateReleaseCheck(userDetails.getUser(), cardId, request)
    );
  }
}
