package com.example.flow_board.domain.whiteboard.controller;

import com.example.flow_board.domain.whiteboard.dto.request.WhiteboardRequests;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardResponse;
import com.example.flow_board.domain.whiteboard.service.WhiteboardWorkspaceService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping(
    "/api/boards/{boardId}/whiteboards"
)
@Tag(
    name = "Whiteboard Workspace",
    description = "다중 화이트보드 작업 공간 관리 API"
)
public class WhiteboardWorkspaceController {

  private final WhiteboardWorkspaceService whiteboardWorkspaceService;

  /**
   * 화이트보드 목록 조회
   */
  @GetMapping
  @Operation(
      summary = "화이트보드 목록 조회",
      description = """
          현재 보드의 화이트보드 목록을 순서대로 조회합니다.

          기존 보드처럼 아직 화이트보드 작업 공간이 없는 경우
          최초 접근 시 기본 화이트보드가 자동 생성됩니다.
          """
  )
  public ApiResponse<List<WhiteboardResponse>> getWhiteboards(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId
  ) {
    List<WhiteboardResponse> response =
        whiteboardWorkspaceService
            .getWhiteboards(
                userDetails.getUser(),
                boardId
            );

    return ApiResponse.success(
        "화이트보드 목록 조회 성공",
        response
    );
  }

  /**
   * 화이트보드 상세 조회
   */
  @GetMapping(
      "/{whiteboardId}"
  )
  @Operation(
      summary = "화이트보드 상세 조회",
      description = "선택한 화이트보드의 기본 정보를 조회합니다."
  )
  public ApiResponse<WhiteboardResponse> getWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId
  ) {
    WhiteboardResponse response =
        whiteboardWorkspaceService
            .getWhiteboard(
                userDetails.getUser(),
                boardId,
                whiteboardId
            );

    return ApiResponse.success(
        "화이트보드 상세 조회 성공",
        response
    );
  }

  /**
   * 기본 화이트보드 조회
   */
  @GetMapping(
      "/default"
  )
  @Operation(
      summary = "기본 화이트보드 조회",
      description = "현재 보드의 기본 화이트보드를 조회합니다."
  )
  public ApiResponse<WhiteboardResponse> getDefaultWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId
  ) {
    WhiteboardResponse response =
        whiteboardWorkspaceService
            .getDefaultWhiteboard(
                userDetails.getUser(),
                boardId
            );

    return ApiResponse.success(
        "기본 화이트보드 조회 성공",
        response
    );
  }

  /**
   * 화이트보드 생성
   */
  @PostMapping
  @Operation(
      summary = "화이트보드 생성",
      description = """
          새 화이트보드 작업 공간을 생성합니다.

          OWNER와 MEMBER만 사용할 수 있습니다.
          """
  )
  public ApiResponse<WhiteboardResponse> createWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @Valid
      @RequestBody
      WhiteboardRequests.Create request
  ) {
    WhiteboardResponse response =
        whiteboardWorkspaceService
            .createWhiteboard(
                userDetails.getUser(),
                boardId,
                request
            );

    return ApiResponse.success(
        "화이트보드 생성 성공",
        response
    );
  }

  /**
   * 이름 / 설명 변경
   */
  @PatchMapping(
      "/{whiteboardId}"
  )
  @Operation(
      summary = "화이트보드 정보 수정",
      description = """
          화이트보드 이름과 설명을 변경합니다.

          OWNER와 MEMBER만 사용할 수 있습니다.
          """
  )
  public ApiResponse<WhiteboardResponse> updateWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @Valid
      @RequestBody
      WhiteboardRequests.Update request
  ) {
    WhiteboardResponse response =
        whiteboardWorkspaceService
            .updateWhiteboard(
                userDetails.getUser(),
                boardId,
                whiteboardId,
                request
            );

    return ApiResponse.success(
        "화이트보드 정보 수정 성공",
        response
    );
  }

  /**
   * 배경색 / Grid 설정
   */
  @PatchMapping(
      "/{whiteboardId}/appearance"
  )
  @Operation(
      summary = "화이트보드 표시 설정 변경",
      description = """
          화이트보드 배경색과 Grid 표시 여부를 변경합니다.

          OWNER와 MEMBER만 사용할 수 있습니다.
          """
  )
  public ApiResponse<WhiteboardResponse> updateAppearance(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @Valid
      @RequestBody
      WhiteboardRequests.Appearance request
  ) {
    WhiteboardResponse response =
        whiteboardWorkspaceService
            .updateAppearance(
                userDetails.getUser(),
                boardId,
                whiteboardId,
                request
            );

    return ApiResponse.success(
        "화이트보드 표시 설정 변경 성공",
        response
    );
  }

  /**
   * 기본 화이트보드 지정
   */
  @PatchMapping(
      "/{whiteboardId}/default"
  )
  @Operation(
      summary = "기본 화이트보드 지정",
      description = """
          선택한 화이트보드를 현재 보드의 기본 화이트보드로 지정합니다.

          하나의 보드에는 하나의 기본 화이트보드만 유지됩니다.
          """
  )
  public ApiResponse<WhiteboardResponse> setDefaultWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId
  ) {
    WhiteboardResponse response =
        whiteboardWorkspaceService
            .setDefaultWhiteboard(
                userDetails.getUser(),
                boardId,
                whiteboardId
            );

    return ApiResponse.success(
        "기본 화이트보드 지정 성공",
        response
    );
  }

  /**
   * 화이트보드 순서 변경
   */
  @PatchMapping(
      "/reorder"
  )
  @Operation(
      summary = "화이트보드 순서 변경",
      description = """
          현재 보드의 모든 화이트보드 ID를
          원하는 순서대로 전달하여 탭 순서를 변경합니다.
          """
  )
  public ApiResponse<List<WhiteboardResponse>> reorderWhiteboards(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @Valid
      @RequestBody
      WhiteboardRequests.Reorder request
  ) {
    List<WhiteboardResponse> response =
        whiteboardWorkspaceService
            .reorderWhiteboards(
                userDetails.getUser(),
                boardId,
                request
            );

    return ApiResponse.success(
        "화이트보드 순서 변경 성공",
        response
    );
  }

  /**
   * 화이트보드 삭제
   */
  @DeleteMapping(
      "/{whiteboardId}"
  )
  @Operation(
      summary = "화이트보드 삭제",
      description = """
          선택한 화이트보드를 삭제합니다.

          보드에는 최소 1개의 화이트보드가 유지됩니다.

          기본 화이트보드를 삭제하면
          남아 있는 첫 번째 화이트보드가
          새로운 기본 화이트보드가 됩니다.
          """
  )
  public ApiResponse<Void> deleteWhiteboard(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId
  ) {
    whiteboardWorkspaceService
        .deleteWhiteboard(
            userDetails.getUser(),
            boardId,
            whiteboardId
        );

    return ApiResponse.success(
        "화이트보드 삭제 성공"
    );
  }
}