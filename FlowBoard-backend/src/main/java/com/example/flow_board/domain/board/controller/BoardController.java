package com.example.flow_board.domain.board.controller;

import com.example.flow_board.domain.board.dto.request.BoardCreateRequest;
import com.example.flow_board.domain.board.dto.request.BoardUpdateRequest;
import com.example.flow_board.domain.board.dto.response.BoardDetailResponse;
import com.example.flow_board.domain.board.dto.response.BoardResponse;
import com.example.flow_board.domain.board.service.BoardService;
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
@RequestMapping("/api/boards")
@RequiredArgsConstructor
@Tag(name = "Board", description = "보드 API")
public class BoardController {

  private final BoardService boardService;

  @PostMapping
  @Operation(summary = "보드 생성", description = "새 보드를 생성합니다.")
  public ApiResponse<BoardResponse> createBoard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @Valid @RequestBody BoardCreateRequest request
  ) {
    BoardResponse response = boardService.createBoard(
        userDetails.getUser(),
        request
    );

    return ApiResponse.success("보드 생성 성공", response);
  }

  @GetMapping
  @Operation(summary = "내 보드 목록 조회", description = "현재 로그인한 사용자의 보드 목록을 조회합니다.")
  public ApiResponse<List<BoardResponse>> getMyBoards(
      @AuthenticationPrincipal CustomUserDetails userDetails
  ) {
    List<BoardResponse> response = boardService.getMyBoards(
        userDetails.getUser()
    );

    return ApiResponse.success("내 보드 목록 조회 성공", response);
  }

  @GetMapping("/{boardId}")
  @Operation(summary = "보드 상세 조회", description = "보드 상세 정보를 조회합니다.")
  public ApiResponse<BoardDetailResponse> getBoardDetail(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId
  ) {
    BoardDetailResponse response = boardService.getBoardDetail(
        userDetails.getUser(),
        boardId
    );

    return ApiResponse.success("보드 상세 조회 성공", response);
  }

  @PatchMapping("/{boardId}")
  @Operation(summary = "보드 수정", description = "보드 정보를 수정합니다.")
  public ApiResponse<BoardResponse> updateBoard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @Valid @RequestBody BoardUpdateRequest request
  ) {
    BoardResponse response = boardService.updateBoard(
        userDetails.getUser(),
        boardId,
        request
    );

    return ApiResponse.success("보드 수정 성공", response);
  }

  @DeleteMapping("/{boardId}")
  @Operation(summary = "보드 삭제", description = "보드를 삭제합니다.")
  public ApiResponse<Void> deleteBoard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId
  ) {
    boardService.deleteBoard(
        userDetails.getUser(),
        boardId
    );

    return ApiResponse.success("보드 삭제 성공");
  }
}