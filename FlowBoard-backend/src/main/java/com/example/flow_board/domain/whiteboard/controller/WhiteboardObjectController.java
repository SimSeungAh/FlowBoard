package com.example.flow_board.domain.whiteboard.controller;

import com.example.flow_board.domain.whiteboard.dto.request.WhiteboardObjectRequests;
import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardObjectResponse;
import com.example.flow_board.domain.whiteboard.service.WhiteboardObjectService;
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
    "/api/boards/{boardId}/whiteboards/{whiteboardId}/objects"
)
@Tag(
    name = "Whiteboard Object",
    description = "화이트보드 스티키 노트 / 텍스트 / 도형 객체 API"
)
public class WhiteboardObjectController {

  private final WhiteboardObjectService whiteboardObjectService;

  @GetMapping
  @Operation(
      summary = "화이트보드 객체 목록 조회",
      description = "현재 화이트보드의 스티키, 텍스트, 도형 객체를 레이어 순서대로 조회합니다."
  )
  public ApiResponse<List<WhiteboardObjectResponse>> getObjects(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId
  ) {
    List<WhiteboardObjectResponse> response =
        whiteboardObjectService.getObjects(
            userDetails.getUser(),
            boardId,
            whiteboardId
        );

    return ApiResponse.success(
        "화이트보드 객체 목록 조회 성공",
        response
    );
  }

  @PostMapping
  @Operation(
      summary = "화이트보드 객체 생성",
      description = "스티키 노트, 텍스트, 사각형, 타원, 화살표 객체를 생성합니다."
  )
  public ApiResponse<WhiteboardObjectResponse> createObject(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @Valid
      @RequestBody
      WhiteboardObjectRequests.Create request
  ) {
    WhiteboardObjectResponse response =
        whiteboardObjectService.createObject(
            userDetails.getUser(),
            boardId,
            whiteboardId,
            request
        );

    return ApiResponse.success(
        "화이트보드 객체 생성 성공",
        response
    );
  }

  @PatchMapping("/{objectId}")
  @Operation(
      summary = "화이트보드 객체 수정",
      description = "객체의 위치, 크기, 내용, 색상 등 현재 상태를 수정합니다."
  )
  public ApiResponse<WhiteboardObjectResponse> updateObject(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @PathVariable
      Long objectId,

      @Valid
      @RequestBody
      WhiteboardObjectRequests.Update request
  ) {
    WhiteboardObjectResponse response =
        whiteboardObjectService.updateObject(
            userDetails.getUser(),
            boardId,
            whiteboardId,
            objectId,
            request
        );

    return ApiResponse.success(
        "화이트보드 객체 수정 성공",
        response
    );
  }

  @PatchMapping("/{objectId}/layer")
  @Operation(
      summary = "화이트보드 객체 레이어 변경",
      description = "선택한 객체의 zIndex를 변경합니다."
  )
  public ApiResponse<WhiteboardObjectResponse> updateLayer(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @PathVariable
      Long objectId,

      @Valid
      @RequestBody
      WhiteboardObjectRequests.Layer request
  ) {
    WhiteboardObjectResponse response =
        whiteboardObjectService.updateLayer(
            userDetails.getUser(),
            boardId,
            whiteboardId,
            objectId,
            request
        );

    return ApiResponse.success(
        "화이트보드 객체 레이어 변경 성공",
        response
    );
  }

  @DeleteMapping("/{objectId}")
  @Operation(
      summary = "화이트보드 객체 삭제",
      description = "현재 화이트보드의 객체 하나를 삭제합니다."
  )
  public ApiResponse<Void> deleteObject(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @PathVariable
      Long whiteboardId,

      @PathVariable
      Long objectId
  ) {
    whiteboardObjectService.deleteObject(
        userDetails.getUser(),
        boardId,
        whiteboardId,
        objectId
    );

    return ApiResponse.success(
        "화이트보드 객체 삭제 성공"
    );
  }
}