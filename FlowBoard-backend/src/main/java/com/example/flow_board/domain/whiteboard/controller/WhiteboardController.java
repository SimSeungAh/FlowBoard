package com.example.flow_board.domain.whiteboard.controller;

import com.example.flow_board.domain.whiteboard.dto.request.WhiteboardStrokeCreateRequest;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardStrokeResponse;
import com.example.flow_board.domain.whiteboard.service.WhiteboardService;
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
@RequestMapping("/api/boards/{boardId}/whiteboard")
@RequiredArgsConstructor
@Tag(
    name = "Whiteboard",
    description = "보드별 Canvas 화이트보드 API"
)
public class WhiteboardController {

  private final WhiteboardService whiteboardService;

  /**
   * 화이트보드 선 저장
   */
  @PostMapping("/strokes")
  @Operation(
      summary = "화이트보드 선 저장",
      description = "Canvas에서 그린 선 하나를 저장합니다."
  )
  public ApiResponse<WhiteboardStrokeResponse> createStroke(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @Valid @RequestBody WhiteboardStrokeCreateRequest request
  ) {
    WhiteboardStrokeResponse response =
        whiteboardService.createStroke(
            userDetails.getUser(),
            boardId,
            request
        );

    return ApiResponse.success(
        "화이트보드 선 저장 성공",
        response
    );
  }

  /**
   * 화이트보드 선 전체 조회
   */
  @GetMapping("/strokes")
  @Operation(
      summary = "화이트보드 조회",
      description = "보드에 저장된 화이트보드 선을 그려진 순서대로 조회합니다."
  )
  public ApiResponse<List<WhiteboardStrokeResponse>> getStrokes(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId
  ) {
    List<WhiteboardStrokeResponse> response =
        whiteboardService.getStrokes(
            userDetails.getUser(),
            boardId
        );

    return ApiResponse.success(
        "화이트보드 조회 성공",
        response
    );
  }

  /**
   * 화이트보드 전체 삭제
   */
  @DeleteMapping("/strokes")
  @Operation(
      summary = "화이트보드 전체 삭제",
      description = "보드에 저장된 모든 화이트보드 선을 삭제합니다."
  )
  public ApiResponse<Void> clearWhiteboard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId
  ) {
    whiteboardService.clearWhiteboard(
        userDetails.getUser(),
        boardId
    );

    return ApiResponse.success(
        "화이트보드 전체 삭제 성공"
    );
  }
}