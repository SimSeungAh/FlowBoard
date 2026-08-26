package com.example.flow_board.domain.requirement.controller;

import com.example.flow_board.domain.requirement.dto.RequirementResponse;
import com.example.flow_board.domain.requirement.dto.RequirementUpdateRequest;
import com.example.flow_board.domain.requirement.service.RequirementService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class RequirementController {

  private final RequirementService requirementService;

  @GetMapping("/api/cards/{cardId}/requirement")
  public ApiResponse<RequirementResponse> getRequirement(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    return ApiResponse.success(
        "요구사항 상세 조회 성공",
        requirementService.getRequirement(userDetails.getUser(), cardId)
    );
  }

  @PatchMapping("/api/cards/{cardId}/requirement")
  public ApiResponse<RequirementResponse> updateRequirement(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @RequestBody RequirementUpdateRequest request
  ) {
    return ApiResponse.success(
        "요구사항 정보 변경 성공",
        requirementService.updateRequirement(userDetails.getUser(), cardId, request)
    );
  }
}
