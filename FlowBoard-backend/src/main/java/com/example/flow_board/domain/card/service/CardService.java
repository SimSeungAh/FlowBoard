package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.card.dto.request.CardCreateRequest;
import com.example.flow_board.domain.card.dto.request.CardMoveRequest;
import com.example.flow_board.domain.card.dto.request.CardSearchCondition;
import com.example.flow_board.domain.card.dto.request.CardUpdateRequest;
import com.example.flow_board.domain.card.dto.request.SecurityReviewUpdateRequest;
import com.example.flow_board.domain.card.dto.request.TestCaseResultUpdateRequest;
import com.example.flow_board.domain.card.dto.request.TestCaseTypeUpdateRequest;
import com.example.flow_board.domain.card.dto.response.CardAssigneeResponse;
import com.example.flow_board.domain.card.dto.response.CardResponse;
import com.example.flow_board.domain.card.dto.response.CardSearchResponse;
import com.example.flow_board.domain.card.dto.response.SecurityReviewPageResponse;
import com.example.flow_board.domain.card.dto.response.SecurityReviewSummaryResponse;
import com.example.flow_board.domain.card.dto.response.TagResponse;
import com.example.flow_board.domain.card.dto.response.TestCasePageResponse;
import com.example.flow_board.domain.card.dto.response.TestCaseSummaryResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.entity.SecuritySeverity;
import com.example.flow_board.domain.card.entity.SecurityVerificationStatus;
import com.example.flow_board.domain.card.entity.TestCaseResult;
import com.example.flow_board.domain.card.entity.TestCaseType;
import com.example.flow_board.domain.card.repository.CardAssigneeRepository;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.repository.CardTagRepository;
import com.example.flow_board.domain.card.util.LexoRankUtil;
import com.example.flow_board.domain.card.websocket.CardEventPublisher;
import com.example.flow_board.domain.card.websocket.CardWebSocketEvent;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
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

  @Transactional
  public CardResponse createCard(
      User user,
      Long boardId,
      Long columnId,
      CardCreateRequest request
  ) {
    Board board = getBoardById(boardId);

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

    Card card = new Card(
        boardColumn,
        user,
        request.title(),
        request.description(),
        createLexoRank(boardColumn),
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

    List<Card> cards =
        cardRepository.searchCards(
            board.getId(),
            condition,
            LocalDateTime.now()
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
        loadAssigneesByCardId(
            cardIds
        );

    Map<Long, List<TagResponse>>
        tagsByCardId =
        loadTagsByCardId(
            cardIds
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

    validatePageRequest(
        page,
        size
    );

    Page<Card> cardPage =
        cardRepository.findTestCases(
            boardId,
            CardTaskType.TEST_CASE,
            testCaseType,
            testCaseResult,
            normalizeKeyword(keyword),
            createPageRequest(
                page,
                size
            )
        );

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

    return TestCasePageResponse.from(
        cardPage,
        loadAssigneesByCardId(
            cardIds
        ),
        loadTagsByCardId(
            cardIds
        )
    );
  }

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

  public SecurityReviewPageResponse getSecurityReviews(
      User user,
      Long boardId,
      SecuritySeverity securitySeverity,
      SecurityVerificationStatus verificationStatus,
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

    validatePageRequest(
        page,
        size
    );

    Page<Card> cardPage =
        cardRepository.findSecurityReviews(
            boardId,
            CardTaskType.SECURITY_REVIEW,
            securitySeverity,
            SecuritySeverity.MEDIUM,
            verificationStatus,
            SecurityVerificationStatus.PENDING,
            normalizeKeyword(keyword),
            createPageRequest(
                page,
                size
            )
        );

    if (cardPage.isEmpty()) {
      return SecurityReviewPageResponse.from(
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

    return SecurityReviewPageResponse.from(
        cardPage,
        loadAssigneesByCardId(
            cardIds
        ),
        loadTagsByCardId(
            cardIds
        )
    );
  }

  public SecurityReviewSummaryResponse
  getSecurityReviewSummary(
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
                CardTaskType.SECURITY_REVIEW
            );

    long critical =
        countSecurityReviewsBySeverity(
            boardId,
            SecuritySeverity.CRITICAL
        );

    long high =
        countSecurityReviewsBySeverity(
            boardId,
            SecuritySeverity.HIGH
        );

    long medium =
        countSecurityReviewsBySeverity(
            boardId,
            SecuritySeverity.MEDIUM
        );

    long low =
        countSecurityReviewsBySeverity(
            boardId,
            SecuritySeverity.LOW
        );

    long pending =
        cardRepository
            .countSecurityReviewsByVerificationStatus(
                boardId,
                CardTaskType.SECURITY_REVIEW,
                SecurityVerificationStatus.PENDING,
                SecurityVerificationStatus.PENDING
            );

    return new SecurityReviewSummaryResponse(
        total,
        critical,
        high,
        medium,
        low,
        pending
    );
  }

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

    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            response
        )
    );

    return response;
  }

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
            + getTestCaseTypeLabel(
            previousType
        )
            + "에서 "
            + getTestCaseTypeLabel(
            card.getTestCaseType()
        )
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

  @Transactional
  public CardResponse updateSecurityReview(
      User user,
      Long cardId,
      SecurityReviewUpdateRequest request
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

    if (
        card.getTaskType()
            != CardTaskType.SECURITY_REVIEW
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    SecuritySeverity previousSeverity =
        card.getSecuritySeverity();

    String previousImpactScope =
        card.getSecurityImpactScope();

    SecurityVerificationStatus
        previousVerificationStatus =
        card.getSecurityVerificationStatus();

    boolean requestedChange = false;

    if (
        request.securitySeverity()
            != null
    ) {
      card.updateSecuritySeverity(
          request.securitySeverity()
      );

      requestedChange = true;
    }

    if (
        request.securityImpactScope()
            != null
    ) {
      card.updateSecurityImpactScope(
          request.securityImpactScope()
      );

      requestedChange = true;
    }

    if (
        request.securityVerificationStatus()
            != null
    ) {
      card.updateSecurityVerificationStatus(
          request.securityVerificationStatus()
      );

      requestedChange = true;
    }

    if (!requestedChange) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

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
            + "' 보안 점검 정보를 수정했습니다"
            + createSecurityReviewChangeDescription(
            previousSeverity,
            card.getSecuritySeverity(),
            previousImpactScope,
            card.getSecurityImpactScope(),
            previousVerificationStatus,
            card.getSecurityVerificationStatus()
        )
            + "."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            response
        )
    );

    return response;
  }

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

  private Map<Long, List<CardAssigneeResponse>>
  loadAssigneesByCardId(
      List<Long> cardIds
  ) {
    if (cardIds.isEmpty()) {
      return Map.of();
    }

    return cardAssigneeRepository
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
  }

  private Map<Long, List<TagResponse>>
  loadTagsByCardId(
      List<Long> cardIds
  ) {
    if (cardIds.isEmpty()) {
      return Map.of();
    }

    return cardTagRepository
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
  }

  private PageRequest createPageRequest(
      int page,
      int size
  ) {
    return PageRequest.of(
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
  }

  private void validatePageRequest(
      int page,
      int size
  ) {
    if (
        page < 0
            || size < 1
            || size > 100
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }
  }

  private String normalizeKeyword(
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

  private long countSecurityReviewsBySeverity(
      Long boardId,
      SecuritySeverity securitySeverity
  ) {
    return cardRepository
        .countSecurityReviewsBySeverity(
            boardId,
            CardTaskType.SECURITY_REVIEW,
            securitySeverity,
            SecuritySeverity.MEDIUM
        );
  }

  private String createSecurityReviewChangeDescription(
      SecuritySeverity previousSeverity,
      SecuritySeverity updatedSeverity,
      String previousImpactScope,
      String updatedImpactScope,
      SecurityVerificationStatus previousVerificationStatus,
      SecurityVerificationStatus updatedVerificationStatus
  ) {
    StringBuilder description =
        new StringBuilder();

    if (
        !Objects.equals(
            previousSeverity,
            updatedSeverity
        )
    ) {
      description
          .append(
              " [심각도: "
          )
          .append(
              getSecuritySeverityLabel(
                  previousSeverity
              )
          )
          .append(
              " → "
          )
          .append(
              getSecuritySeverityLabel(
                  updatedSeverity
              )
          )
          .append(
              "]"
          );
    }

    if (
        !Objects.equals(
            previousImpactScope,
            updatedImpactScope
        )
    ) {
      description
          .append(
              " [영향 범위: "
          )
          .append(
              getSecurityImpactScopeLabel(
                  previousImpactScope
              )
          )
          .append(
              " → "
          )
          .append(
              getSecurityImpactScopeLabel(
                  updatedImpactScope
              )
          )
          .append(
              "]"
          );
    }

    if (
        !Objects.equals(
            previousVerificationStatus,
            updatedVerificationStatus
        )
    ) {
      description
          .append(
              " [검증 상태: "
          )
          .append(
              getSecurityVerificationStatusLabel(
                  previousVerificationStatus
              )
          )
          .append(
              " → "
          )
          .append(
              getSecurityVerificationStatusLabel(
                  updatedVerificationStatus
              )
          )
          .append(
              "]"
          );
    }

    return description.toString();
  }

  private String getSecuritySeverityLabel(
      SecuritySeverity severity
  ) {
    if (severity == null) {
      return "보통";
    }

    return switch (severity) {
      case CRITICAL -> "긴급";
      case HIGH -> "높음";
      case MEDIUM -> "보통";
      case LOW -> "낮음";
    };
  }

  private String getSecurityVerificationStatusLabel(
      SecurityVerificationStatus status
  ) {
    if (status == null) {
      return "검증 대기";
    }

    return switch (status) {
      case PENDING -> "검증 대기";
      case IN_PROGRESS -> "검증 중";
      case RETEST_REQUIRED -> "재검증 필요";
      case VERIFIED -> "검증 완료";
    };
  }

  private String getSecurityImpactScopeLabel(
      String impactScope
  ) {
    if (
        impactScope == null
            || impactScope.isBlank()
    ) {
      return "미지정";
    }

    return impactScope;
  }

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

  private String getTestCaseTypeLabel(
      TestCaseType type
  ) {
    if (type == null) {
      return "미지정";
    }

    return switch (type) {
      case NORMAL -> "정상";
      case EXCEPTION -> "예외";
      case BOUNDARY -> "경계값";
      case PERMISSION -> "권한";
      case SECURITY -> "보안";
      case RECOVERY -> "복구";
      case INTEGRATION -> "통합";
      case E2E -> "E2E";
    };
  }

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
        targetIndex
            == targetCards.size()
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
          targetIndex
              == targetCards.size()
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

  private Board getBoardById(
      Long boardId
  ) {
    return boardRepository
        .findById(
            boardId
        )
        .orElseThrow(() ->
            new CustomException(
                ErrorCode.BOARD_NOT_FOUND
            )
        );
  }

  private BoardColumn getColumnById(
      Long columnId
  ) {
    return boardColumnRepository
        .findById(
            columnId
        )
        .orElseThrow(() ->
            new CustomException(
                ErrorCode.COLUMN_NOT_FOUND
            )
        );
  }

  private Card getCardById(
      Long cardId
  ) {
    return cardRepository
        .findById(
            cardId
        )
        .orElseThrow(() ->
            new CustomException(
                ErrorCode.CARD_NOT_FOUND
            )
        );
  }

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