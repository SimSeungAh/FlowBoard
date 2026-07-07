package com.example.flow_board.domain.card.controller;

import com.example.flow_board.domain.card.dto.request.ChecklistCreateRequest;
import com.example.flow_board.domain.card.dto.request.ChecklistItemCreateRequest;
import com.example.flow_board.domain.card.dto.request.ChecklistItemUpdateRequest;
import com.example.flow_board.domain.card.dto.request.ChecklistUpdateRequest;
import com.example.flow_board.domain.card.dto.response.ChecklistItemResponse;
import com.example.flow_board.domain.card.dto.response.ChecklistResponse;
import com.example.flow_board.domain.card.service.ChecklistService;
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
@Tag(name = "Checklist", description = "체크리스트 API")
public class ChecklistController {

  private final ChecklistService checklistService;

  @PostMapping("/api/cards/{cardId}/checklists")
  @Operation(summary = "체크리스트 생성", description = "카드에 체크리스트를 생성합니다.")
  public ApiResponse<ChecklistResponse> createChecklist(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @Valid @RequestBody ChecklistCreateRequest request
  ) {
    ChecklistResponse response = checklistService.createChecklist(
        userDetails.getUser(),
        cardId,
        request
    );

    return ApiResponse.success("체크리스트 생성 성공", response);
  }

  @GetMapping("/api/cards/{cardId}/checklists")
  @Operation(summary = "체크리스트 목록 조회", description = "카드의 체크리스트 목록을 조회합니다.")
  public ApiResponse<List<ChecklistResponse>> getChecklists(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    List<ChecklistResponse> response = checklistService.getChecklists(
        userDetails.getUser(),
        cardId
    );

    return ApiResponse.success("체크리스트 목록 조회 성공", response);
  }

  @PatchMapping("/api/checklists/{checklistId}")
  @Operation(summary = "체크리스트 수정", description = "체크리스트 제목을 수정합니다.")
  public ApiResponse<ChecklistResponse> updateChecklist(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long checklistId,
      @Valid @RequestBody ChecklistUpdateRequest request
  ) {
    ChecklistResponse response = checklistService.updateChecklist(
        userDetails.getUser(),
        checklistId,
        request
    );

    return ApiResponse.success("체크리스트 수정 성공", response);
  }

  @DeleteMapping("/api/checklists/{checklistId}")
  @Operation(summary = "체크리스트 삭제", description = "체크리스트를 삭제합니다.")
  public ApiResponse<Void> deleteChecklist(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long checklistId
  ) {
    checklistService.deleteChecklist(
        userDetails.getUser(),
        checklistId
    );

    return ApiResponse.success("체크리스트 삭제 성공");
  }

  @PostMapping("/api/checklists/{checklistId}/items")
  @Operation(summary = "체크리스트 항목 생성", description = "체크리스트에 항목을 추가합니다.")
  public ApiResponse<ChecklistItemResponse> createChecklistItem(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long checklistId,
      @Valid @RequestBody ChecklistItemCreateRequest request
  ) {
    ChecklistItemResponse response = checklistService.createChecklistItem(
        userDetails.getUser(),
        checklistId,
        request
    );

    return ApiResponse.success("체크리스트 항목 생성 성공", response);
  }

  @PatchMapping("/api/checklist-items/{itemId}")
  @Operation(summary = "체크리스트 항목 수정", description = "체크리스트 항목 내용을 수정합니다.")
  public ApiResponse<ChecklistItemResponse> updateChecklistItem(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long itemId,
      @Valid @RequestBody ChecklistItemUpdateRequest request
  ) {
    ChecklistItemResponse response = checklistService.updateChecklistItem(
        userDetails.getUser(),
        itemId,
        request
    );

    return ApiResponse.success("체크리스트 항목 수정 성공", response);
  }

  @PatchMapping("/api/checklist-items/{itemId}/toggle")
  @Operation(summary = "체크리스트 항목 체크 변경", description = "체크리스트 항목의 체크 상태를 변경합니다.")
  public ApiResponse<ChecklistItemResponse> toggleChecklistItem(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long itemId
  ) {
    ChecklistItemResponse response = checklistService.toggleChecklistItem(
        userDetails.getUser(),
        itemId
    );

    return ApiResponse.success("체크리스트 항목 체크 변경 성공", response);
  }

  @DeleteMapping("/api/checklist-items/{itemId}")
  @Operation(summary = "체크리스트 항목 삭제", description = "체크리스트 항목을 삭제합니다.")
  public ApiResponse<Void> deleteChecklistItem(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long itemId
  ) {
    checklistService.deleteChecklistItem(
        userDetails.getUser(),
        itemId
    );

    return ApiResponse.success("체크리스트 항목 삭제 성공");
  }
}