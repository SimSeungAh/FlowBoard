package com.example.flow_board.domain.card.controller;

import com.example.flow_board.domain.card.dto.request.*;
import com.example.flow_board.domain.card.dto.response.CardResponse;
import com.example.flow_board.domain.card.dto.response.CardSearchResponse;
import com.example.flow_board.domain.card.dto.response.TestCaseSummaryResponse;
import com.example.flow_board.domain.card.service.CardService;
import com.example.flow_board.global.response.ApiResponse;
import com.example.flow_board.global.security.service.CustomUserDetails;
import com.example.flow_board.domain.card.dto.response.TestCasePageResponse;
import com.example.flow_board.domain.card.entity.TestCaseResult;
import com.example.flow_board.domain.card.entity.TestCaseType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(
        name = "Card",
        description = "카드 API"
)
public class CardController {

  private final CardService cardService;

  /**
   * 카드 생성
   */
  @PostMapping(
          "/api/boards/{boardId}/columns/{columnId}/cards"
  )
  @Operation(
          summary = "카드 생성",
          description = "특정 컬럼에 카드를 생성합니다."
  )
  public ApiResponse<CardResponse> createCard(
          @AuthenticationPrincipal
          CustomUserDetails userDetails,

          @PathVariable
          Long boardId,

          @PathVariable
          Long columnId,

          @Valid
          @RequestBody
          CardCreateRequest request
  ) {
    CardResponse response =
            cardService.createCard(
                    userDetails.getUser(),
                    boardId,
                    columnId,
                    request
            );

    return ApiResponse.success(
            "카드 생성 성공",
            response
    );
  }

  /**
   * 컬럼별 카드 목록 조회
   */
  @GetMapping(
          "/api/boards/{boardId}/columns/{columnId}/cards"
  )
  @Operation(
          summary = "컬럼별 카드 목록 조회",
          description = "특정 컬럼에 속한 카드 목록을 조회합니다."
  )
  public ApiResponse<List<CardResponse>>
  getCardsByColumn(
          @AuthenticationPrincipal
          CustomUserDetails userDetails,

          @PathVariable
          Long boardId,

          @PathVariable
          Long columnId
  ) {

    List<CardResponse> response =
            cardService.getCardsByColumn(
                    userDetails.getUser(),
                    boardId,
                    columnId
            );

    return ApiResponse.success(
            "컬럼별 카드 목록 조회 성공",
            response
    );
  }

  /**
   * 보드 카드 검색 / 필터
   *
   * 사용 가능한 Query Parameter:
   *
   * keyword
   * assigneeId
   * tagId
   * dueDateFilter
   */
  @GetMapping(
          "/api/boards/{boardId}/cards/search"
  )
  @Operation(
          summary = "카드 검색 및 필터",
          description =
                  "검색어, 담당자, 태그, 마감일 조건으로 "
                          + "보드 내 카드를 검색합니다."
  )
  public ApiResponse<List<CardSearchResponse>>
  searchCards(
          @AuthenticationPrincipal
          CustomUserDetails userDetails,

          @PathVariable
          Long boardId,

          @RequestParam(
                  name = "keyword",
                  required = false
          )
          String keyword,

          @RequestParam(
                  name = "assigneeId",
                  required = false
          )
          Long assigneeId,

          @RequestParam(
                  name = "tagId",
                  required = false
          )
          Long tagId,

          @RequestParam(
                  name = "dueDateFilter",
                  required = false
          )
          CardDueDateFilter dueDateFilter
  ) {

    CardSearchCondition condition =
            new CardSearchCondition(
                    keyword,
                    assigneeId,
                    tagId,
                    dueDateFilter
            );

    List<CardSearchResponse> response =
            cardService.searchCards(
                    userDetails.getUser(),
                    boardId,
                    condition
            );

    return ApiResponse.success(
            "카드 검색 성공",
            response
    );
  }

  /**
   * 보드 테스트 케이스 전용 목록 조회
   *
   * TEST_CASE 타입의 카드만 조회합니다.
   */
  @GetMapping(
      "/api/boards/{boardId}/test-cases"
  )
  @Operation(
      summary = "테스트 케이스 목록 조회",
      description =
          "보드의 테스트 케이스만 조회합니다. "
              + "테스트 유형, 결과, 검색어 필터와 "
              + "페이지네이션을 지원합니다."
  )
  public ApiResponse<TestCasePageResponse>
  getTestCases(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId,

      @RequestParam(
          name = "testCaseType",
          required = false
      )
      TestCaseType testCaseType,

      @RequestParam(
          name = "testCaseResult",
          required = false
      )
      TestCaseResult testCaseResult,

      @RequestParam(
          name = "keyword",
          required = false
      )
      String keyword,

      @RequestParam(
          name = "page",
          defaultValue = "0"
      )
      int page,

      @RequestParam(
          name = "size",
          defaultValue = "20"
      )
      int size
  ) {
    TestCasePageResponse response =
        cardService.getTestCases(
            userDetails.getUser(),
            boardId,
            testCaseType,
            testCaseResult,
            keyword,
            page,
            size
        );

    return ApiResponse.success(
        "테스트 케이스 목록 조회 성공",
        response
    );
  }

  /**
   * 테스트 케이스 결과 요약 조회
   */
  @GetMapping(
      "/api/boards/{boardId}/test-cases/summary"
  )
  @Operation(
      summary = "테스트 케이스 결과 요약 조회",
      description =
          "보드 전체 테스트 케이스의 "
              + "미실행, PASS, FAIL, BLOCKED 개수를 조회합니다."
  )
  public ApiResponse<TestCaseSummaryResponse>
  getTestCaseSummary(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long boardId
  ) {
    TestCaseSummaryResponse response =
        cardService.getTestCaseSummary(
            userDetails.getUser(),
            boardId
        );

    return ApiResponse.success(
        "테스트 케이스 결과 요약 조회 성공",
        response
    );
  }

  /**
   * 카드 상세 조회
   */
  @GetMapping(
          "/api/cards/{cardId}"
  )
  @Operation(
          summary = "카드 상세 조회",
          description = "카드 상세 정보를 조회합니다."
  )
  public ApiResponse<CardResponse> getCardDetail(
          @AuthenticationPrincipal
          CustomUserDetails userDetails,

          @PathVariable
          Long cardId
  ) {
    CardResponse response =
            cardService.getCardDetail(
                    userDetails.getUser(),
                    cardId
            );

    return ApiResponse.success(
            "카드 상세 조회 성공",
            response
    );
  }

  /**
   * 카드 수정
   */
  @PatchMapping(
          "/api/cards/{cardId}"
  )
  @Operation(
          summary = "카드 수정",
          description = "카드 정보를 수정합니다."
  )
  public ApiResponse<CardResponse> updateCard(
          @AuthenticationPrincipal
          CustomUserDetails userDetails,

          @PathVariable
          Long cardId,

          @Valid
          @RequestBody
          CardUpdateRequest request
  ) {
    CardResponse response =
            cardService.updateCard(
                    userDetails.getUser(),
                    cardId,
                    request
            );

    return ApiResponse.success(
            "카드 수정 성공",
            response
    );
  }

  /**
   * 테스트 케이스 결과 변경
   */
  @PatchMapping(
      "/api/cards/{cardId}/test-case/result"
  )
  @Operation(
      summary = "테스트 케이스 결과 변경",
      description =
          "테스트 케이스의 결과를 "
              + "미실행, PASS, FAIL, BLOCKED 중 하나로 변경합니다."
  )
  public ApiResponse<CardResponse>
  updateTestCaseResult(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long cardId,

      @Valid
      @RequestBody
      TestCaseResultUpdateRequest request
  ) {
    CardResponse response =
        cardService.updateTestCaseResult(
            userDetails.getUser(),
            cardId,
            request
        );

    return ApiResponse.success(
        "테스트 결과 변경 성공",
        response
    );
  }

  /**
   * 테스트 케이스 유형 변경
   */
  @PatchMapping(
      "/api/cards/{cardId}/test-case/type"
  )
  @Operation(
      summary = "테스트 케이스 유형 변경",
      description =
          "테스트 케이스의 유형을 "
              + "정상, 예외, 경계값, 권한, 보안, 복구, "
              + "통합, E2E 중 하나로 변경합니다."
  )
  public ApiResponse<CardResponse>
  updateTestCaseType(
      @AuthenticationPrincipal
      CustomUserDetails userDetails,

      @PathVariable
      Long cardId,

      @Valid
      @RequestBody
      TestCaseTypeUpdateRequest request
  ) {
    CardResponse response =
        cardService.updateTestCaseType(
            userDetails.getUser(),
            cardId,
            request
        );

    return ApiResponse.success(
        "테스트 케이스 유형 변경 성공",
        response
    );
  }

  /**
   * 카드 이동
   */
  @PatchMapping(
          "/api/cards/{cardId}/move"
  )
  @Operation(
          summary = "카드 이동",
          description =
                  "드래그 앤 드롭 결과에 따라 "
                          + "카드의 컬럼과 순서를 변경합니다."
  )
  public ApiResponse<CardResponse> moveCard(
          @AuthenticationPrincipal
          CustomUserDetails userDetails,

          @PathVariable
          Long cardId,

          @Valid
          @RequestBody
          CardMoveRequest request
  ) {
    CardResponse response =
            cardService.moveCard(
                    userDetails.getUser(),
                    cardId,
                    request
            );

    return ApiResponse.success(
            "카드 이동 성공",
            response
    );
  }

  /**
   * 카드 삭제
   */
  @DeleteMapping(
          "/api/cards/{cardId}"
  )
  @Operation(
          summary = "카드 삭제",
          description = "카드를 삭제합니다."
  )
  public ApiResponse<Void> deleteCard(
          @AuthenticationPrincipal
          CustomUserDetails userDetails,

          @PathVariable
          Long cardId
  ) {
    cardService.deleteCard(
            userDetails.getUser(),
            cardId
    );

    return ApiResponse.success(
            "카드 삭제 성공"
    );
  }
}