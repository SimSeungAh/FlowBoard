package com.example.flow_board.domain.card.controller;

import com.example.flow_board.domain.card.dto.request.CardCreateRequest;
import com.example.flow_board.domain.card.dto.request.CardUpdateRequest;
import com.example.flow_board.domain.card.dto.response.CardResponse;
import com.example.flow_board.domain.card.service.CardService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import com.example.flow_board.domain.card.dto.request.CardMoveRequest;
import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Card", description = "카드 API")
public class CardController {

  private final CardService cardService;

  @PostMapping("/api/boards/{boardId}/columns/{columnId}/cards")
  @Operation(summary = "카드 생성", description = "특정 컬럼에 카드를 생성합니다.")
  public ApiResponse<CardResponse> createCard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @PathVariable Long columnId,
      @Valid @RequestBody CardCreateRequest request
  ) {
    CardResponse response = cardService.createCard(
        userDetails.getUser(),
        boardId,
        columnId,
        request
    );

    return ApiResponse.success("카드 생성 성공", response);
  }

  @GetMapping("/api/boards/{boardId}/columns/{columnId}/cards")
  @Operation(summary = "컬럼별 카드 목록 조회", description = "특정 컬럼에 속한 카드 목록을 조회합니다.")
  public ApiResponse<List<CardResponse>> getCardsByColumn(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long boardId,
      @PathVariable Long columnId
  ) {
    List<CardResponse> response = cardService.getCardsByColumn(
        userDetails.getUser(),
        boardId,
        columnId
    );

    return ApiResponse.success("컬럼별 카드 목록 조회 성공", response);
  }

  @GetMapping("/api/cards/{cardId}")
  @Operation(summary = "카드 상세 조회", description = "카드 상세 정보를 조회합니다.")
  public ApiResponse<CardResponse> getCardDetail(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    CardResponse response = cardService.getCardDetail(
        userDetails.getUser(),
        cardId
    );

    return ApiResponse.success("카드 상세 조회 성공", response);
  }

  @PatchMapping("/api/cards/{cardId}")
  @Operation(summary = "카드 수정", description = "카드 정보를 수정합니다.")
  public ApiResponse<CardResponse> updateCard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @Valid @RequestBody CardUpdateRequest request
  ) {
    CardResponse response = cardService.updateCard(
        userDetails.getUser(),
        cardId,
        request
    );

    return ApiResponse.success("카드 수정 성공", response);
  }

  @PatchMapping("/api/cards/{cardId}/move")
  @Operation(summary = "카드 이동", description = "드래그 앤 드롭 결과에 따라 카드의 컬럼과 순서를 변경합니다.")
  public ApiResponse<CardResponse> moveCard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId,
      @Valid @RequestBody CardMoveRequest request
  ) {
    CardResponse response = cardService.moveCard(
        userDetails.getUser(),
        cardId,
        request
    );

    return ApiResponse.success("카드 이동 성공", response);
  }

  @DeleteMapping("/api/cards/{cardId}")
  @Operation(summary = "카드 삭제", description = "카드를 삭제합니다.")
  public ApiResponse<Void> deleteCard(
      @AuthenticationPrincipal CustomUserDetails userDetails,
      @PathVariable Long cardId
  ) {
    cardService.deleteCard(
        userDetails.getUser(),
        cardId
    );

    return ApiResponse.success("카드 삭제 성공");
  }
}