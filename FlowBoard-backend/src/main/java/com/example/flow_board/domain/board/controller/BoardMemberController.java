package com.example.flow_board.domain.board.controller;

import com.example.flow_board.domain.board.dto.request.BoardMemberInviteRequest;
import com.example.flow_board.domain.board.dto.request.BoardMemberRoleUpdateRequest;
import com.example.flow_board.domain.board.dto.response.BoardMemberResponse;
import com.example.flow_board.domain.board.service.BoardMemberService;
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
@RequestMapping("/api/boards/{boardId}/members")
@RequiredArgsConstructor
@Tag(name = "Board Member", description = "보드 멤버 관리 API")
public class BoardMemberController {

  private final BoardMemberService boardMemberService;

  @PostMapping
  @Operation(
      summary = "보드 멤버 추가",
      description = "이메일을 사용하여 기존 회원을 보드 멤버로 추가합니다."
  )
  public ApiResponse<BoardMemberResponse> inviteMember(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @Valid @RequestBody BoardMemberInviteRequest request
  ) {
    BoardMemberResponse response = boardMemberService.inviteMember(
        userDetails.getUser(),
        boardId,
        request
    );

    return ApiResponse.success("보드 멤버 추가 성공", response);
  }

  @GetMapping
  @Operation(
      summary = "보드 멤버 목록 조회",
      description = "보드에 참여 중인 멤버 목록을 조회합니다."
  )
  public ApiResponse<List<BoardMemberResponse>> getBoardMembers(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId
  ) {
    List<BoardMemberResponse> response =
        boardMemberService.getBoardMembers(
            userDetails.getUser(),
            boardId
        );

    return ApiResponse.success(
        "보드 멤버 목록 조회 성공",
        response
    );
  }

  @PatchMapping("/{memberId}")
  @Operation(
      summary = "보드 멤버 권한 변경",
      description = "보드 멤버의 역할을 MEMBER 또는 VIEWER로 변경합니다."
  )
  public ApiResponse<BoardMemberResponse> updateMemberRole(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @PathVariable Long memberId,
      @Valid @RequestBody BoardMemberRoleUpdateRequest request
  ) {
    BoardMemberResponse response =
        boardMemberService.updateMemberRole(
            userDetails.getUser(),
            boardId,
            memberId,
            request
        );

    return ApiResponse.success(
        "보드 멤버 권한 변경 성공",
        response
    );
  }

  @DeleteMapping("/{memberId}")
  @Operation(
      summary = "보드 멤버 제거",
      description = "보드에서 멤버를 제거합니다."
  )
  public ApiResponse<Void> removeMember(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @PathVariable Long memberId
  ) {
    boardMemberService.removeMember(
        userDetails.getUser(),
        boardId,
        memberId
    );

    return ApiResponse.success("보드 멤버 제거 성공");
  }
}