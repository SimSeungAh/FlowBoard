package com.example.flow_board.domain.designreview.controller;

import com.example.flow_board.domain.designreview.dto.DesignReviewResponse;
import com.example.flow_board.domain.designreview.dto.DesignReviewUpdateRequest;
import com.example.flow_board.domain.designreview.service.DesignReviewService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class DesignReviewController {

  private final DesignReviewService designReviewService;

  @GetMapping("/api/cards/{cardId}/design-review")
  public ApiResponse<DesignReviewResponse> getDesignReview(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    return ApiResponse.success(
        "디자인 리뷰 상세 조회 성공",
        designReviewService.getDesignReview(userDetails.getUser(), cardId)
    );
  }

  @PatchMapping("/api/cards/{cardId}/design-review")
  public ApiResponse<DesignReviewResponse> updateDesignReview(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @RequestBody DesignReviewUpdateRequest request
  ) {
    return ApiResponse.success(
        "디자인 리뷰 정보 변경 성공",
        designReviewService.updateDesignReview(userDetails.getUser(), cardId, request)
    );
  }
}
