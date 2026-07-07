package com.example.flow_board.domain.card.controller;

import com.example.flow_board.domain.card.dto.request.TagCreateRequest;
import com.example.flow_board.domain.card.dto.request.TagUpdateRequest;
import com.example.flow_board.domain.card.dto.response.TagResponse;
import com.example.flow_board.domain.card.service.TagService;
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
@Tag(name = "Tag", description = "태그 API")
public class TagController {

  private final TagService tagService;

  @PostMapping("/api/boards/{boardId}/tags")
  @Operation(summary = "태그 생성", description = "보드에 태그를 생성합니다.")
  public ApiResponse<TagResponse> createTag(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @Valid @RequestBody TagCreateRequest request
  ) {
    TagResponse response = tagService.createTag(
        userDetails.getUser(),
        boardId,
        request
    );

    return ApiResponse.success("태그 생성 성공", response);
  }

  @GetMapping("/api/boards/{boardId}/tags")
  @Operation(summary = "보드 태그 목록 조회", description = "보드에 생성된 태그 목록을 조회합니다.")
  public ApiResponse<List<TagResponse>> getBoardTags(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId
  ) {
    List<TagResponse> response = tagService.getBoardTags(
        userDetails.getUser(),
        boardId
    );

    return ApiResponse.success("보드 태그 목록 조회 성공", response);
  }

  @PatchMapping("/api/tags/{tagId}")
  @Operation(summary = "태그 수정", description = "태그 이름과 색상을 수정합니다.")
  public ApiResponse<TagResponse> updateTag(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long tagId,
      @Valid @RequestBody TagUpdateRequest request
  ) {
    TagResponse response = tagService.updateTag(
        userDetails.getUser(),
        tagId,
        request
    );

    return ApiResponse.success("태그 수정 성공", response);
  }

  @DeleteMapping("/api/tags/{tagId}")
  @Operation(summary = "태그 삭제", description = "태그를 삭제합니다.")
  public ApiResponse<Void> deleteTag(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long tagId
  ) {
    tagService.deleteTag(
        userDetails.getUser(),
        tagId
    );

    return ApiResponse.success("태그 삭제 성공");
  }

  @PostMapping("/api/cards/{cardId}/tags/{tagId}")
  @Operation(summary = "카드에 태그 연결", description = "카드에 태그를 추가합니다.")
  public ApiResponse<TagResponse> addTagToCard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @PathVariable Long tagId
  ) {
    TagResponse response = tagService.addTagToCard(
        userDetails.getUser(),
        cardId,
        tagId
    );

    return ApiResponse.success("카드 태그 연결 성공", response);
  }

  @GetMapping("/api/cards/{cardId}/tags")
  @Operation(summary = "카드 태그 목록 조회", description = "카드에 연결된 태그 목록을 조회합니다.")
  public ApiResponse<List<TagResponse>> getCardTags(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    List<TagResponse> response = tagService.getCardTags(
        userDetails.getUser(),
        cardId
    );

    return ApiResponse.success("카드 태그 목록 조회 성공", response);
  }

  @DeleteMapping("/api/cards/{cardId}/tags/{tagId}")
  @Operation(summary = "카드 태그 연결 해제", description = "카드에서 태그를 제거합니다.")
  public ApiResponse<Void> removeTagFromCard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @PathVariable Long tagId
  ) {
    tagService.removeTagFromCard(
        userDetails.getUser(),
        cardId,
        tagId
    );

    return ApiResponse.success("카드 태그 연결 해제 성공");
  }
}