package com.example.flow_board.domain.card.controller;

import com.example.flow_board.domain.card.dto.request.CommentCreateRequest;
import com.example.flow_board.domain.card.dto.request.CommentUpdateRequest;
import com.example.flow_board.domain.card.dto.response.CommentResponse;
import com.example.flow_board.domain.card.service.CommentService;
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
@Tag(name = "Comment", description = "댓글 API")
public class CommentController {

  private final CommentService commentService;

  @PostMapping("/api/cards/{cardId}/comments")
  @Operation(summary = "댓글 생성", description = "카드에 댓글을 작성합니다.")
  public ApiResponse<CommentResponse> createComment(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @Valid @RequestBody CommentCreateRequest request
  ) {
    CommentResponse response = commentService.createComment(
        userDetails.getUser(),
        cardId,
        request
    );

    return ApiResponse.success("댓글 생성 성공", response);
  }

  @GetMapping("/api/cards/{cardId}/comments")
  @Operation(summary = "댓글 목록 조회", description = "카드의 댓글 목록을 조회합니다.")
  public ApiResponse<List<CommentResponse>> getComments(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    List<CommentResponse> response = commentService.getComments(
        userDetails.getUser(),
        cardId
    );

    return ApiResponse.success("댓글 목록 조회 성공", response);
  }

  @PatchMapping("/api/comments/{commentId}")
  @Operation(summary = "댓글 수정", description = "내가 작성한 댓글을 수정합니다.")
  public ApiResponse<CommentResponse> updateComment(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long commentId,
      @Valid @RequestBody CommentUpdateRequest request
  ) {
    CommentResponse response = commentService.updateComment(
        userDetails.getUser(),
        commentId,
        request
    );

    return ApiResponse.success("댓글 수정 성공", response);
  }

  @DeleteMapping("/api/comments/{commentId}")
  @Operation(summary = "댓글 삭제", description = "내가 작성한 댓글을 삭제합니다.")
  public ApiResponse<Void> deleteComment(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long commentId
  ) {
    commentService.deleteComment(
        userDetails.getUser(),
        commentId
    );

    return ApiResponse.success("댓글 삭제 성공");
  }
}