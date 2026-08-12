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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(
    "/api/boards/{boardId}/whiteboard"
)
@Tag(
    name = "Whiteboard",
    description = "보드 화이트보드 API"
)
public class WhiteboardController {

  private final WhiteboardService whiteboardService;

  /**
   * 화이트보드 선 저장
   *
   * OWNER / MEMBER만 가능합니다.
   */
  @PostMapping("/strokes")
  @Operation(
      summary = "화이트보드 선 저장",
      description =
          "사용자가 Canvas에서 그린 하나의 선을 저장합니다."
  )
  public ApiResponse<WhiteboardStrokeResponse>
  createStroke(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @Valid
      @RequestBody
      WhiteboardStrokeCreateRequest request
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
   * 화이트보드 전체 선 조회
   *
   * OWNER / MEMBER / VIEWER 모두 가능합니다.
   */
  @GetMapping("/strokes")
  @Operation(
      summary = "화이트보드 조회",
      description =
          "현재 보드에 저장된 모든 화이트보드 선을 조회합니다."
  )
  public ApiResponse<List<WhiteboardStrokeResponse>>
  getStrokes(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId
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
   *
   * OWNER / MEMBER만 가능합니다.
   */
  @DeleteMapping("/strokes")
  @Operation(
      summary = "화이트보드 전체 삭제",
      description =
          "현재 보드에 저장된 모든 화이트보드 선을 삭제합니다."
  )
  public ApiResponse<Void> clearWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId
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