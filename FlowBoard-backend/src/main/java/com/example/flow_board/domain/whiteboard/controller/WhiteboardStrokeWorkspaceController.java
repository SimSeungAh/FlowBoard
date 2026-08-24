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
    "/api/boards/{boardId}/whiteboards/{whiteboardId}"
)
@Tag(
    name = "Whiteboard Stroke Workspace",
    description = "다중 화이트보드별 Canvas 선 관리 API"
)
public class WhiteboardStrokeWorkspaceController {

  private final WhiteboardService whiteboardService;

  /**
   * 선택한 화이트보드의 선 전체 조회
   *
   * OWNER / MEMBER / VIEWER 가능
   */
  @GetMapping("/strokes")
  @Operation(
      summary = "화이트보드별 선 조회",
      description = """
          선택한 whiteboardId에 저장된
          모든 Canvas 선을 조회합니다.
          """
  )
  public ApiResponse<List<WhiteboardStrokeResponse>> getStrokes(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId
  ) {
    List<WhiteboardStrokeResponse> response =
        whiteboardService.getStrokes(
            userDetails.getUser(),
            boardId,
            whiteboardId
        );

    return ApiResponse.success(
        "화이트보드 선 조회 성공",
        response
    );
  }

  /**
   * 선택한 화이트보드에 선 저장
   *
   * OWNER / MEMBER 가능
   */
  @PostMapping("/strokes")
  @Operation(
      summary = "화이트보드별 선 저장",
      description = """
          선택한 whiteboardId의 Canvas에
          하나의 PEN / ERASER 선을 저장합니다.
          """
  )
  public ApiResponse<WhiteboardStrokeResponse> createStroke(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @Valid
      @RequestBody
      WhiteboardStrokeCreateRequest request
  ) {
    WhiteboardStrokeResponse response =
        whiteboardService.createStroke(
            userDetails.getUser(),
            boardId,
            whiteboardId,
            request
        );

    return ApiResponse.success(
        "화이트보드 선 저장 성공",
        response
    );
  }

  /**
   * 선택한 화이트보드에서 특정 선 삭제
   *
   * Undo / 선 전체 지우기에서 사용
   */
  @DeleteMapping(
      "/strokes/{strokeId}"
  )
  @Operation(
      summary = "화이트보드별 개별 선 삭제",
      description = """
          선택한 화이트보드에 포함된
          특정 선 하나를 삭제합니다.
          """
  )
  public ApiResponse<Void> deleteStroke(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @PathVariable
      Long strokeId
  ) {
    whiteboardService.deleteStroke(
        userDetails.getUser(),
        boardId,
        whiteboardId,
        strokeId
    );

    return ApiResponse.success(
        "화이트보드 선 삭제 성공"
    );
  }

  /**
   * 선택한 화이트보드 전체 초기화
   */
  @DeleteMapping("/strokes")
  @Operation(
      summary = "화이트보드별 전체 초기화",
      description = """
          현재 선택한 whiteboardId의 선만
          모두 삭제합니다.

          다른 화이트보드의 내용은 삭제되지 않습니다.
          """
  )
  public ApiResponse<Void> clearWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId
  ) {
    whiteboardService.clearWhiteboard(
        userDetails.getUser(),
        boardId,
        whiteboardId
    );

    return ApiResponse.success(
        "화이트보드 전체 삭제 성공"
    );
  }
}