package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.card.dto.request.CardCreateRequest;
import com.example.flow_board.domain.card.dto.request.CardMoveRequest;
import com.example.flow_board.domain.card.dto.request.CardUpdateRequest;
import com.example.flow_board.domain.card.dto.response.CardResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.util.LexoRankUtil;
import com.example.flow_board.domain.card.websocket.CardEventPublisher;
import com.example.flow_board.domain.card.websocket.CardWebSocketEvent;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardService {

  private final BoardRepository boardRepository;
  private final BoardColumnRepository boardColumnRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final CardRepository cardRepository;
  private final CardEventPublisher cardEventPublisher;

  /**
   * 카드 생성
   */
  @Transactional
  public CardResponse createCard(
      User user,
      Long boardId,
      Long columnId,
      CardCreateRequest request
  ) {
    Board board = getBoardById(boardId);
    validateBoardAccess(board, user);

    BoardColumn boardColumn = getColumnById(columnId);
    validateColumnInBoard(boardColumn, board);

    String rank = createLexoRank(boardColumn);

    Card card = new Card(
        boardColumn,
        user,
        request.title(),
        request.description(),
        rank,
        request.dueDate()
    );

    Card savedCard = cardRepository.save(card);
    CardResponse response = CardResponse.from(savedCard);

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
   */
  public List<CardResponse> getCardsByColumn(
      User user,
      Long boardId,
      Long columnId
  ) {
    Board board = getBoardById(boardId);
    validateBoardAccess(board, user);

    BoardColumn boardColumn = getColumnById(columnId);
    validateColumnInBoard(boardColumn, board);

    return cardRepository
        .findByBoardColumnOrderByRankAsc(boardColumn)
        .stream()
        .map(CardResponse::from)
        .toList();
  }

  /**
   * 카드 상세 조회
   */
  public CardResponse getCardDetail(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    return CardResponse.from(card);
  }

  /**
   * 카드 수정
   */
  @Transactional
  public CardResponse updateCard(
      User user,
      Long cardId,
      CardUpdateRequest request
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    card.update(
        request.title(),
        request.description(),
        request.dueDate()
    );

    CardResponse response = CardResponse.from(card);

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
   */
  @Transactional
  public CardResponse moveCard(
      User user,
      Long cardId,
      CardMoveRequest request
  ) {
    Card card = getCardById(cardId);
    Board sourceBoard = card.getBoardColumn().getBoard();

    validateBoardAccess(sourceBoard, user);

    BoardColumn targetColumn = getColumnById(
        request.targetColumnId()
    );

    validateColumnInBoard(targetColumn, sourceBoard);

    List<Card> targetCards = cardRepository
        .findByBoardColumnOrderByRankAsc(targetColumn)
        .stream()
        .filter(item ->
            !Objects.equals(item.getId(), card.getId())
        )
        .toList();

    validateTargetIndex(
        request.targetIndex(),
        targetCards.size()
    );

    String newRank = createMoveRank(
        targetCards,
        request.targetIndex()
    );

    card.moveTo(targetColumn, newRank);

    CardResponse response = CardResponse.from(card);

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
   */
  @Transactional
  public void deleteCard(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    cardRepository.delete(card);

    cardEventPublisher.publish(
        CardWebSocketEvent.deleted(
            board.getId(),
            cardId
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
        .findTopByBoardColumnOrderByRankDesc(boardColumn)
        .map(lastCard ->
            LexoRankUtil.between(
                lastCard.getRank(),
                null
            )
        )
        .orElseGet(() ->
            LexoRankUtil.between(null, null)
        );
  }

  /**
   * 카드가 이동할 위치의 앞뒤 rank를 기준으로 새 rank 생성
   */
  private String createMoveRank(
      List<Card> targetCards,
      int targetIndex
  ) {
    String prevRank = targetIndex == 0
        ? null
        : targetCards.get(targetIndex - 1).getRank();

    String nextRank = targetIndex == targetCards.size()
        ? null
        : targetCards.get(targetIndex).getRank();

    if (!LexoRankUtil.hasSpace(prevRank, nextRank)) {
      rebalanceCards(targetCards);

      prevRank = targetIndex == 0
          ? null
          : targetCards.get(targetIndex - 1).getRank();

      nextRank = targetIndex == targetCards.size()
          ? null
          : targetCards.get(targetIndex).getRank();
    }

    return LexoRankUtil.between(
        prevRank,
        nextRank
    );
  }

  /**
   * rank 사이에 공간이 없으면 해당 컬럼의 카드 rank 재배치
   */
  private void rebalanceCards(
      List<Card> cards
  ) {
    for (int i = 0; i < cards.size(); i++) {
      Card card = cards.get(i);

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
   * 이동할 인덱스 유효성 검사
   */
  private void validateTargetIndex(
      Integer targetIndex,
      int maxIndex
  ) {
    if (
        targetIndex == null ||
            targetIndex < 0 ||
            targetIndex > maxIndex
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }
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
                ErrorCode.COLUMN_NOT_FOUND
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
   * 사용자가 보드 멤버인지 검사
   */
  private void validateBoardAccess(
      Board board,
      User user
  ) {
    boolean hasAccess =
        boardMemberRepository.existsByBoardAndUser(
            board,
            user
        );

    if (!hasAccess) {
      throw new CustomException(
          ErrorCode.BOARD_ACCESS_DENIED
      );
    }
  }

  /**
   * 컬럼이 해당 보드에 속해 있는지 검사
   */
  private void validateColumnInBoard(
      BoardColumn boardColumn,
      Board board
  ) {
    if (
        !Objects.equals(
            boardColumn.getBoard().getId(),
            board.getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.COLUMN_NOT_FOUND
      );
    }
  }
}