package com.example.flow_board.domain.whiteboard.controller;

import com.example.flow_board.domain.whiteboard.dto.response.WhiteboardObjectResponse;
import com.example.flow_board.domain.whiteboard.service.WhiteboardImageService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/boards/{boardId}/whiteboards/{whiteboardId}/images")
@Tag(
    name = "Whiteboard Image",
    description = "화이트보드 이미지 업로드 및 조회 API"
)
public class WhiteboardImageController {

  private final WhiteboardImageService whiteboardImageService;

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  @Operation(
      summary = "화이트보드 이미지 업로드",
      description = "PNG/JPG/GIF 이미지를 업로드하고 화이트보드 IMAGE 객체를 생성합니다. 최대 10MB입니다."
  )
  public ApiResponse<WhiteboardObjectResponse> uploadImage(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @PathVariable Long whiteboardId,
      @RequestPart("file") MultipartFile file
  ) {
    WhiteboardObjectResponse response = whiteboardImageService.uploadImage(
        userDetails.getUser(),
        boardId,
        whiteboardId,
        file
    );

    return ApiResponse.success("화이트보드 이미지 추가 성공", response);
  }

  @GetMapping("/{objectId}/content")
  @Operation(
      summary = "화이트보드 이미지 파일 조회",
      description = "보드 읽기 권한을 확인한 뒤 이미지 바이너리를 반환합니다."
  )
  public ResponseEntity<Resource> getImageContent(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @PathVariable Long whiteboardId,
      @PathVariable Long objectId
  ) {
    WhiteboardImageService.ImageContent content = whiteboardImageService.getImageContent(
        userDetails.getUser(),
        boardId,
        whiteboardId,
        objectId
    );

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(content.contentType()))
        .contentLength(content.contentLength())
        .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
        .body(content.resource());
  }
}
