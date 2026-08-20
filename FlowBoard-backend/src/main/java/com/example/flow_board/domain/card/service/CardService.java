package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.card.dto.request.*;
import com.example.flow_board.domain.card.dto.response.*;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.repository.CardAssigneeRepository;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.repository.CardTagRepository;
import com.example.flow_board.domain.card.util.LexoRankUtil;
import com.example.flow_board.domain.card.websocket.CardEventPublisher;
import com.example.flow_board.domain.card.websocket.CardWebSocketEvent;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.entity.TestCaseResult;
import com.example.flow_board.domain.card.entity.TestCaseType;
import com.example.flow_board.domain.card.dto.request.TestCaseTypeUpdateRequest;


import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardService {

  private final BoardRepository boardRepository;
  private final BoardColumnRepository boardColumnRepository;
  private final BoardPermissionService boardPermissionService;
  private final CardRepository cardRepository;
  private final CardAssigneeRepository cardAssigneeRepository;
  private final CardTagRepository cardTagRepository;
  private final CardEventPublisher cardEventPublisher;
  private final ActivityLogService activityLogService;
  private final CardDependencyCleanupService cardDependencyCleanupService;

  /**
   * 카드 생성
   * <p>
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public CardResponse createCard(
      User user,
      Long boardId,
      Long columnId,
      CardCreateRequest request
  ) {
    Board board =
        getBoardById(boardId);

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    BoardColumn boardColumn =
        getColumnById(columnId);

    validateColumnInBoard(
        boardColumn,
        board
    );

    String rank =
        createLexoRank(boardColumn);

    /*
     * taskType과 testCaseType을
     * Card Entity까지 전달합니다.
     *
     * 기존 프론트처럼 두 값이 전달되지 않아도
     * Entity에서 GENERAL로 처리됩니다.
     *
     * 테스트 결과는 사용자가 지정해서 만드는 값이 아니라
     * 테스트 케이스 생성 시 NOT_RUN으로 시작하므로
     * null을 전달하고 Entity에서 기본값을 적용합니다.
     */
    Card card = new Card(
        boardColumn,
        user,
        request.title(),
        request.description(),
        rank,
        request.dueDate(),
        request.taskType(),
        request.testCaseType(),
        null
    );

    Card savedCard =
        cardRepository.save(card);

    CardResponse response =
        CardResponse.from(savedCard);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_CREATED,
        savedCard.getId(),
        savedCard.getTitle(),
        user.getNickname()
            + "님이 '"
            + savedCard.getTitle()
            + "' 카드를 생성했습니다."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.created(
            board.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 컬럼별 카드 목록 조회
   * <p>
   * OWNER, MEMBER, VIEWER 모두 가능합니다.
   */
  public List<CardResponse> getCardsByColumn(
      User user,
      Long boardId,
      Long columnId
  ) {
    Board board =
        getBoardById(boardId);

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    BoardColumn boardColumn =
        getColumnById(columnId);

    validateColumnInBoard(
        boardColumn,
        board
    );

    return cardRepository
        .findByBoardColumnOrderByRankAsc(
            boardColumn
        )
        .stream()
        .map(CardResponse::from)
        .toList();
  }

  /**
   * 보드 내 카드 검색 및 필터
   * <p>
   * OWNER, MEMBER, VIEWER 모두 가능합니다.
   */
  public List<CardSearchResponse> searchCards(
      User user,
      Long boardId,
      CardSearchCondition condition
  ) {
    Board board =
        getBoardById(boardId);

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    LocalDateTime referenceTime =
        LocalDateTime.now();

    List<Card> cards =
        cardRepository.searchCards(
            board.getId(),
            condition,
            referenceTime
        );

    if (cards.isEmpty()) {
      return List.of();
    }

    List<Long> cardIds =
        cards.stream()
            .map(Card::getId)
            .toList();

    Map<Long, List<CardAssigneeResponse>>
        assigneesByCardId =
        cardAssigneeRepository
            .findAllByCardIdsWithUser(
                cardIds
            )
            .stream()
            .collect(
                Collectors.groupingBy(
                    cardAssignee ->
                        cardAssignee
                            .getCard()
                            .getId(),
                    Collectors.mapping(
                        CardAssigneeResponse::from,
                        Collectors.toList()
                    )
                )
            );

    Map<Long, List<TagResponse>>
        tagsByCardId =
        cardTagRepository
            .findAllByCardIdsWithTag(
                cardIds
            )
            .stream()
            .collect(
                Collectors.groupingBy(
                    cardTag ->
                        cardTag
                            .getCard()
                            .getId(),
                    Collectors.mapping(
                        cardTag ->
                            TagResponse.from(
                                cardTag.getTag()
                            ),
                        Collectors.toList()
                    )
                )
            );

    return cards
        .stream()
        .map(card ->
            CardSearchResponse.from(
                card,
                assigneesByCardId.getOrDefault(
                    card.getId(),
                    List.of()
                ),
                tagsByCardId.getOrDefault(
                    card.getId(),
                    List.of()
                )
            )
        )
        .toList();
  }

  /**
   * 보드 테스트 케이스 목록 조회
   * <p>
   * 일반 카드와 분리해서 TEST_CASE 카드만 조회합니다.
   * <p>
   * OWNER / MEMBER / VIEWER 모두 조회할 수 있습니다.
   */
  public TestCasePageResponse getTestCases(
      User user,
      Long boardId,
      TestCaseType testCaseType,
      TestCaseResult testCaseResult,
      String keyword,
      int page,
      int size
  ) {
    Board board =
        getBoardById(boardId);

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    /*
     * 페이지 번호는 0 이상,
     * 한 페이지 크기는 1 ~ 100으로 제한합니다.
     */
    if (
        page < 0
            || size < 1
            || size > 100
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    String normalizedKeyword =
        normalizeTestCaseKeyword(
            keyword
        );

    PageRequest pageable =
        PageRequest.of(
            page,
            size,
            Sort.by(
                Sort.Order.desc(
                    "updatedAt"
                ),
                Sort.Order.desc(
                    "id"
                )
            )
        );

    Page<Card> cardPage =
        cardRepository.findTestCases(
            boardId,
            CardTaskType.TEST_CASE,
            testCaseType,
            testCaseResult,
            normalizedKeyword,
            pageable
        );

    /*
     * 결과가 없으면 담당자/태그 쿼리를
     * 추가로 실행할 필요가 없습니다.
     */
    if (cardPage.isEmpty()) {
      return TestCasePageResponse.from(
          cardPage,
          Map.of(),
          Map.of()
      );
    }

    List<Long> cardIds =
        cardPage
            .getContent()
            .stream()
            .map(Card::getId)
            .toList();

    Map<Long, List<CardAssigneeResponse>>
        assigneesByCardId =
        cardAssigneeRepository
            .findAllByCardIdsWithUser(
                cardIds
            )
            .stream()
            .collect(
                Collectors.groupingBy(
                    cardAssignee ->
                        cardAssignee
                            .getCard()
                            .getId(),
                    Collectors.mapping(
                        CardAssigneeResponse::from,
                        Collectors.toList()
                    )
                )
            );

    Map<Long, List<TagResponse>>
        tagsByCardId =
        cardTagRepository
            .findAllByCardIdsWithTag(
                cardIds
            )
            .stream()
            .collect(
                Collectors.groupingBy(
                    cardTag ->
                        cardTag
                            .getCard()
                            .getId(),
                    Collectors.mapping(
                        cardTag ->
                            TagResponse.from(
                                cardTag.getTag()
                            ),
                        Collectors.toList()
                    )
                )
            );

    return TestCasePageResponse.from(
        cardPage,
        assigneesByCardId,
        tagsByCardId
    );
  }

  /**
   * 테스트 케이스 검색어 정규화
   * <p>
   * null 또는 공백만 있는 문자열은
   * 검색 조건에서 제외합니다.
   */
  private String normalizeTestCaseKeyword(
      String keyword
  ) {
    if (keyword == null) {
      return null;
    }

    String normalized =
        keyword.trim();

    return normalized.isEmpty()
        ? null
        : normalized;
  }

  /**
   * 카드 상세 조회
   * <p>
   * OWNER, MEMBER, VIEWER 모두 가능합니다.
   */
  public CardResponse getCardDetail(
      User user,
      Long cardId
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    return CardResponse.from(card);
  }

  /**
   * 카드 수정
   * <p>
   * OWNER와 MEMBER만 가능합니다.
   * <p>
   * 일반 카드의 제목/설명/마감일 수정에서는
   * 작업 유형이나 테스트 결과를 변경하지 않습니다.
   */
  @Transactional
  public CardResponse updateCard(
      User user,
      Long cardId,
      CardUpdateRequest request
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    card.update(
        request.title(),
        request.description(),
        request.dueDate()
    );

    CardResponse response =
        CardResponse.from(card);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드를 수정했습니다."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 테스트 케이스 결과 변경
   *
   * TEST_CASE 카드에서만 사용할 수 있습니다.
   *
   * OWNER와 MEMBER만 변경할 수 있고,
   * VIEWER는 읽기만 가능합니다.
   */
  @Transactional
  public CardResponse updateTestCaseResult(
      User user,
      Long cardId,
      TestCaseResultUpdateRequest request
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    TestCaseResult previousResult =
        card.getTestCaseResult();

    /*
     * Card Entity 내부에서
     * TEST_CASE 카드인지 다시 검증합니다.
     *
     * 일반 카드라면 CARD_NOT_TEST_CASE 예외가 발생합니다.
     */
    card.updateTestCaseResult(
        request.testCaseResult()
    );

    CardResponse response =
        CardResponse.from(card);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 테스트 결과를 "
            + getTestCaseResultLabel(
            previousResult
        )
            + "에서 "
            + getTestCaseResultLabel(
            card.getTestCaseResult()
        )
            + "(으)로 변경했습니다."
    );

    /*
     * 테스트 케이스 전용 화면뿐 아니라
     * 칸반/카드 상세에서도 즉시 반영되도록
     * 기존 카드 UPDATED 이벤트를 그대로 사용합니다.
     */
    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 테스트 케이스 유형 변경
   *
   * TEST_CASE 카드에서만 사용할 수 있습니다.
   * OWNER와 MEMBER만 변경할 수 있습니다.
   */
  @Transactional
  public CardResponse updateTestCaseType(
      User user,
      Long cardId,
      TestCaseTypeUpdateRequest request
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    TestCaseType previousType =
        card.getTestCaseType();

    card.updateTestCaseType(
        request.testCaseType()
    );

    CardResponse response =
        CardResponse.from(card);

    String previousTypeLabel =
        previousType == null
            ? "미지정"
            : switch (previousType) {
          case NORMAL -> "정상";
          case EXCEPTION -> "예외";
          case BOUNDARY -> "경계값";
          case PERMISSION -> "권한";
          case SECURITY -> "보안";
          case RECOVERY -> "복구";
          case INTEGRATION -> "통합";
          case E2E -> "E2E";
        };

    TestCaseType updatedType =
        card.getTestCaseType();

    String updatedTypeLabel =
        switch (updatedType) {
          case NORMAL -> "정상";
          case EXCEPTION -> "예외";
          case BOUNDARY -> "경계값";
          case PERMISSION -> "권한";
          case SECURITY -> "보안";
          case RECOVERY -> "복구";
          case INTEGRATION -> "통합";
          case E2E -> "E2E";
        };

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 테스트 유형을 "
            + previousTypeLabel
            + "에서 "
            + updatedTypeLabel
            + "(으)로 변경했습니다."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            response
        )
    );

    return response;
  }


  /**
   * 카드 이동 및 순서 변경
   * <p>
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public CardResponse moveCard(
      User user,
      Long cardId,
      CardMoveRequest request
  ) {
    Card card =
        getCardById(cardId);

    BoardColumn sourceColumn =
        card.getBoardColumn();

    Board sourceBoard =
        sourceColumn.getBoard();

    boardPermissionService.validateWritePermission(
        sourceBoard,
        user
    );

    BoardColumn targetColumn =
        getColumnById(
            request.targetColumnId()
        );

    validateColumnInBoard(
        targetColumn,
        sourceBoard
    );

    List<Card> targetCards =
        cardRepository
            .findByBoardColumnOrderByRankAsc(
                targetColumn
            )
            .stream()
            .filter(item ->
                !Objects.equals(
                    item.getId(),
                    card.getId()
                )
            )
            .toList();

    validateTargetIndex(
        request.targetIndex(),
        targetCards.size()
    );

    String newRank =
        createMoveRank(
            targetCards,
            request.targetIndex()
        );

    String sourceColumnTitle =
        sourceColumn.getTitle();

    String targetColumnTitle =
        targetColumn.getTitle();

    boolean sameColumn =
        Objects.equals(
            sourceColumn.getId(),
            targetColumn.getId()
        );

    card.moveTo(
        targetColumn,
        newRank
    );

    CardResponse response =
        CardResponse.from(card);

    String description;

    if (sameColumn) {
      description =
          user.getNickname()
              + "님이 '"
              + card.getTitle()
              + "' 카드의 순서를 변경했습니다.";
    } else {
      description =
          user.getNickname()
              + "님이 '"
              + card.getTitle()
              + "' 카드를 '"
              + sourceColumnTitle
              + "'에서 '"
              + targetColumnTitle
              + "'(으)로 이동했습니다.";
    }

    activityLogService.recordActivity(
        sourceBoard,
        user,
        ActivityType.CARD_MOVED,
        card.getId(),
        card.getTitle(),
        description
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.moved(
            sourceBoard.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 카드 삭제
   * <p>
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public void deleteCard(
      User user,
      Long cardId
  ) {
    Card card =
        getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    Long deletedCardId =
        card.getId();

    String deletedCardTitle =
        card.getTitle();

    cardDependencyCleanupService
        .deleteDependencies(card);

    cardRepository.delete(card);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_DELETED,
        deletedCardId,
        deletedCardTitle,
        user.getNickname()
            + "님이 '"
            + deletedCardTitle
            + "' 카드를 삭제했습니다."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.deleted(
            board.getId(),
            deletedCardId
        )
    );
  }

  /**
   * 컬럼 마지막 카드 뒤에 들어갈 LexoRank 생성
   */
  private String createLexoRank(
      BoardColumn boardColumn
  ) {
    return cardRepository
        .findTopByBoardColumnOrderByRankDesc(
            boardColumn
        )
        .map(lastCard ->
            LexoRankUtil.between(
                lastCard.getRank(),
                null
            )
        )
        .orElseGet(() ->
            LexoRankUtil.between(
                null,
                null
            )
        );
  }

  /**
   * 이동 위치의 앞뒤 rank를 기준으로
   * 새로운 LexoRank를 생성합니다.
   */
  private String createMoveRank(
      List<Card> targetCards,
      int targetIndex
  ) {
    String prevRank =
        targetIndex == 0
            ? null
            : targetCards
            .get(targetIndex - 1)
            .getRank();

    String nextRank =
        targetIndex == targetCards.size()
            ? null
            : targetCards
            .get(targetIndex)
            .getRank();

    if (
        !LexoRankUtil.hasSpace(
            prevRank,
            nextRank
        )
    ) {
      rebalanceCards(
          targetCards
      );

      prevRank =
          targetIndex == 0
              ? null
              : targetCards
              .get(targetIndex - 1)
              .getRank();

      nextRank =
          targetIndex == targetCards.size()
              ? null
              : targetCards
              .get(targetIndex)
              .getRank();
    }

    return LexoRankUtil.between(
        prevRank,
        nextRank
    );
  }

  /**
   * rank 사이에 공간이 없으면
   * 해당 컬럼의 카드 rank를 재배치합니다.
   */
  private void rebalanceCards(
      List<Card> cards
  ) {
    for (
        int i = 0;
        i < cards.size();
        i++
    ) {
      Card card =
          cards.get(i);

      card.moveTo(
          card.getBoardColumn(),
          LexoRankUtil.rankAt(
              i,
              cards.size()
          )
      );
    }
  }

  /**
   * 이동 대상 인덱스 검사
   */
  private void validateTargetIndex(
      Integer targetIndex,
      int maxIndex
  ) {
    if (
        targetIndex == null
            || targetIndex < 0
            || targetIndex > maxIndex
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }
  }

  /**
   * 활동 기록에 표시할 테스트 결과 한글명
   */
  private String getTestCaseResultLabel(
      TestCaseResult result
  ) {
    if (result == null) {
      return "미실행";
    }

    return switch (result) {
      case NOT_RUN -> "미실행";
      case PASS -> "PASS";
      case FAIL -> "FAIL";
      case BLOCKED -> "BLOCKED";
    };
  }

  /**
   * 보드 테스트 케이스 결과 요약
   *
   * 현재 페이지에 표시된 데이터가 아니라
   * 보드 전체 TEST_CASE 카드를 기준으로 집계합니다.
   *
   * OWNER / MEMBER / VIEWER 모두 조회할 수 있습니다.
   */
  public TestCaseSummaryResponse getTestCaseSummary(
      User user,
      Long boardId
  ) {
    Board board =
        getBoardById(boardId);

    boardPermissionService.validateReadPermission(
        board,
        user
    );

    long total =
        cardRepository
            .countByBoardColumn_Board_IdAndTaskType(
                boardId,
                CardTaskType.TEST_CASE
            );

    long notRun =
        cardRepository
            .countByBoardColumn_Board_IdAndTaskTypeAndTestCaseResult(
                boardId,
                CardTaskType.TEST_CASE,
                TestCaseResult.NOT_RUN
            );

    long pass =
        cardRepository
            .countByBoardColumn_Board_IdAndTaskTypeAndTestCaseResult(
                boardId,
                CardTaskType.TEST_CASE,
                TestCaseResult.PASS
            );

    long fail =
        cardRepository
            .countByBoardColumn_Board_IdAndTaskTypeAndTestCaseResult(
                boardId,
                CardTaskType.TEST_CASE,
                TestCaseResult.FAIL
            );

    long blocked =
        cardRepository
            .countByBoardColumn_Board_IdAndTaskTypeAndTestCaseResult(
                boardId,
                CardTaskType.TEST_CASE,
                TestCaseResult.BLOCKED
            );

    return new TestCaseSummaryResponse(
        total,
        notRun,
        pass,
        fail,
        blocked
    );
  }

  /**
   * 보드 조회
   */
  private Board getBoardById(
      Long boardId
  ) {
    return boardRepository
        .findById(boardId)
        .orElseThrow(() ->
            new CustomException(
                ErrorCode.BOARD_NOT_FOUND
            )
        );
  }

  /**
   * 컬럼 조회
   */
  private BoardColumn getColumnById(
      Long columnId
  ) {
    return boardColumnRepository
        .findById(columnId)
        .orElseThrow(() ->
            new CustomException(
                ErrorCode
                    .COLUMN_NOT_FOUND
            )
        );
  }

  /**
   * 카드 조회
   */
  private Card getCardById(
      Long cardId
  ) {
    return cardRepository
        .findById(cardId)
        .orElseThrow(() ->
            new CustomException(
                ErrorCode.CARD_NOT_FOUND
            )
        );
  }

  /**
   * 컬럼이 해당 보드 소속인지 검사
   */
  private void validateColumnInBoard(
      BoardColumn boardColumn,
      Board board
  ) {
    if (
        !Objects.equals(
            boardColumn
                .getBoard()
                .getId(),
            board.getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }
  }
}