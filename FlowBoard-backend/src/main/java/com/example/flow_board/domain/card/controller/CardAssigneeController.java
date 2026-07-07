package com.example.flow_board.domain.card.controller;

import com.example.flow_board.domain.card.dto.request.CardAssigneeAddRequest;
import com.example.flow_board.domain.card.dto.response.CardAssigneeResponse;
import com.example.flow_board.domain.card.service.CardAssigneeService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Card Assignee", description = "카드 담당자 API")
public class CardAssigneeController {

  private final CardAssigneeService cardAssigneeService;

  @PostMapping("/api/cards/{cardId}/assignees")
  @Operation(summary = "카드 담당자 추가", description = "카드에 담당자를 추가합니다.")
  public ApiResponse<CardAssigneeResponse> addAssignee(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @Valid @RequestBody CardAssigneeAddRequest request
  ) {
    CardAssigneeResponse response = cardAssigneeService.addAssignee(
        userDetails.getUser(),
        cardId,
        request
    );

    return ApiResponse.success("카드 담당자 추가 성공", response);
  }

  @GetMapping("/api/cards/{cardId}/assignees")
  @Operation(summary = "카드 담당자 목록 조회", description = "카드의 담당자 목록을 조회합니다.")
  public ApiResponse<List<CardAssigneeResponse>> getAssignees(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    List<CardAssigneeResponse> response = cardAssigneeService.getAssignees(
        userDetails.getUser(),
        cardId
    );

    return ApiResponse.success("카드 담당자 목록 조회 성공", response);
  }

  @DeleteMapping("/api/cards/{cardId}/assignees/{userId}")
  @Operation(summary = "카드 담당자 제거", description = "카드에서 담당자를 제거합니다.")
  public ApiResponse<Void> removeAssignee(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @PathVariable Long userId
  ) {
    cardAssigneeService.removeAssignee(
        userDetails.getUser(),
        cardId,
        userId
    );

    return ApiResponse.success("카드 담당자 제거 성공");
  }
}