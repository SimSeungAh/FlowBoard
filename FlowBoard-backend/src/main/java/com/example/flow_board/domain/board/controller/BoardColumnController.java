package com.example.flow_board.domain.board.controller;

import com.example.flow_board.domain.board.dto.request.BoardColumnRequests;
import com.example.flow_board.domain.board.dto.response.BoardColumnResponse;
import com.example.flow_board.domain.board.service.BoardColumnService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping(
    "/api/boards/{boardId}/columns"
)
@RequiredArgsConstructor
@Tag(
    name = "Board Column",
    description = "보드 컬럼 / 워크플로우 커스터마이징 API"
)
public class BoardColumnController {

  private final BoardColumnService boardColumnService;

  /**
   * 컬럼 목록 조회
   *
   * OWNER / MEMBER / VIEWER 가능
   */
  @GetMapping
  @Operation(
      summary = "보드 컬럼 목록 조회",
      description = """
          현재 보드의 컬럼 목록을
          position 오름차순으로 조회합니다.
          """
  )
  public ApiResponse<
      List<BoardColumnResponse>
      > getColumns(

      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId

  ) {
    List<BoardColumnResponse> response =
        boardColumnService
            .getColumns(
                userDetails.getUser(),
                boardId
            );

    return ApiResponse.success(
        "보드 컬럼 목록 조회 성공",
        response
    );
  }

  /**
   * 컬럼 추가
   *
   * OWNER 전용
   */
  @PostMapping
  @Operation(
      summary = "보드 컬럼 추가",
      description = """
          OWNER가 워크플로우 마지막에
          새로운 컬럼을 추가합니다.
          """
  )
  public ApiResponse<
      BoardColumnResponse
      > createColumn(

      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @Valid
      @RequestBody
      BoardColumnRequests.Create request

  ) {
    BoardColumnResponse response =
        boardColumnService
            .createColumn(
                userDetails.getUser(),
                boardId,
                request
            );

    return ApiResponse.success(
        "보드 컬럼 생성 성공",
        response
    );
  }

  /**
   * 컬럼 이름 변경
   *
   * OWNER 전용
   */
  @PatchMapping(
      "/{columnId}"
  )
  @Operation(
      summary = "보드 컬럼 이름 변경",
      description = """
          OWNER가 컬럼 이름을 변경합니다.
          """
  )
  public ApiResponse<
      BoardColumnResponse
      > updateColumn(

      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long columnId,

      @Valid
      @RequestBody
      BoardColumnRequests.Update request

  ) {
    BoardColumnResponse response =
        boardColumnService
            .updateColumn(
                userDetails.getUser(),
                boardId,
                columnId,
                request
            );

    return ApiResponse.success(
        "보드 컬럼 수정 성공",
        response
    );
  }

  /**
   * 완료 단계 여부 변경
   *
   * OWNER 전용
   */
  @PatchMapping(
      "/{columnId}/completion"
  )
  @Operation(
      summary = "보드 컬럼 완료 단계 여부 변경",
      description = """
          OWNER가 특정 컬럼을 프로젝트의 완료 단계인지 설정합니다.

          완료 단계로 지정된 컬럼은
          대시보드 완료율, 지연 작업 제외,
          추후 번다운 / 누적 흐름도 계산 기준으로 사용됩니다.

          여러 컬럼을 완료 단계로 지정할 수 있습니다.
          """
  )
  public ApiResponse<
      BoardColumnResponse
      > updateCompletionColumn(

      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long columnId,

      @RequestParam
      boolean completionColumn

  ) {
    BoardColumnResponse response =
        boardColumnService
            .updateCompletionColumn(
                userDetails.getUser(),
                boardId,
                columnId,
                completionColumn
            );

    return ApiResponse.success(
        completionColumn
            ? "완료 단계 설정 성공"
            : "완료 단계 해제 성공",
        response
    );
  }

  /**
   * 컬럼 순서 변경
   *
   * OWNER 전용
   */
  @PatchMapping(
      "/reorder"
  )
  @Operation(
      summary = "보드 컬럼 순서 변경",
      description = """
          OWNER가 현재 보드의 모든 컬럼 ID를
          원하는 순서대로 전달하여
          워크플로우 순서를 변경합니다.
          """
  )
  public ApiResponse<
      List<BoardColumnResponse>
      > reorderColumns(

      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @Valid
      @RequestBody
      BoardColumnRequests.Reorder request

  ) {
    List<BoardColumnResponse> response =
        boardColumnService
            .reorderColumns(
                userDetails.getUser(),
                boardId,
                request
            );

    return ApiResponse.success(
        "보드 컬럼 순서 변경 성공",
        response
    );
  }

  /**
   * 컬럼 삭제
   *
   * OWNER 전용
   *
   * 작업이 남아 있는 컬럼과
   * 마지막 컬럼은 삭제할 수 없습니다.
   */
  @DeleteMapping(
      "/{columnId}"
  )
  @Operation(
      summary = "보드 컬럼 삭제",
      description = """
          OWNER가 비어 있는 컬럼을 삭제합니다.

          마지막 남은 컬럼은 삭제할 수 없으며,
          작업이 남아 있는 컬럼 역시
          데이터 보호를 위해 삭제할 수 없습니다.
          """
  )
  public ApiResponse<Void> deleteColumn(

      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long columnId

  ) {
    boardColumnService
        .deleteColumn(
            userDetails.getUser(),
            boardId,
            columnId
        );

    return ApiResponse.success(
        "보드 컬럼 삭제 성공"
    );
  }
}