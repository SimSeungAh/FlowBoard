package com.example.flow_board.domain.presence.controller;

import com.example.flow_board.domain.presence.dto.BoardPresenceHeartbeatRequest;
import com.example.flow_board.domain.presence.dto.BoardPresenceResponse;
import com.example.flow_board.domain.presence.service.BoardPresenceService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/boards/{boardId}/presence")
public class BoardPresenceController {

  private final BoardPresenceService boardPresenceService;

  @PostMapping("/heartbeat")
  public ApiResponse<Void> heartbeat(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @Valid @RequestBody BoardPresenceHeartbeatRequest request
  ) {
    boardPresenceService.heartbeat(userDetails.getUser(), boardId, request);
    return ApiResponse.success("접속 상태 갱신 성공");
  }

  @GetMapping
  public ApiResponse<List<BoardPresenceResponse>> getOnlineMembers(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId
  ) {
    return ApiResponse.success(
        "현재 접속자 조회 성공",
        boardPresenceService.getOnlineMembers(userDetails.getUser(), boardId)
    );
  }
}
