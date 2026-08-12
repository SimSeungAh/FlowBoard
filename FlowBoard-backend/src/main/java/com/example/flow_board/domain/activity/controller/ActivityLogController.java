package com.example.flow_board.domain.activity.controller;

import com.example.flow_board.domain.activity.dto.response.ActivityLogResponse;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping(
    "/api/boards/{boardId}/activities"
)
@Tag(
    name = "Activity Log",
    description = "보드 활동 로그 API"
)
public class ActivityLogController {

  private final ActivityLogService activityLogService;

  /**
   * 보드 활동 로그 조회
   *
   * OWNER / MEMBER / VIEWER 모두 조회 가능합니다.
   *
   * 기본 페이지 크기:
   * 20개
   */
  @GetMapping
  @Operation(
      summary = "보드 활동 로그 조회",
      description =
          "보드에서 발생한 활동을 최신순으로 조회합니다."
  )
  public ApiResponse<Page<ActivityLogResponse>>
  getBoardActivities(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PageableDefault(
          size = 20
      )
      Pageable pageable
  ) {

    Page<ActivityLogResponse> response =
        activityLogService
            .getBoardActivities(
                userDetails.getUser(),
                boardId,
                pageable
            );

    return ApiResponse.success(
        "보드 활동 로그 조회 성공",
        response
    );
  }
}