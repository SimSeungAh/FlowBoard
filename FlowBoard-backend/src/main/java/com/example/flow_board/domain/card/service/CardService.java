package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.board.repository.BoardColumnRepository;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.card.dto.request.CardCreateRequest;
import com.example.flow_board.domain.card.dto.request.CardUpdateRequest;
import com.example.flow_board.domain.card.dto.response.CardResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.repository.CardRepository;
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

    String rank = createSimpleRank(boardColumn);

    Card card = new Card(
        boardColumn,
        user,
        request.title(),
        request.description(),
        rank,
        request.dueDate()
    );

    Card savedCard = cardRepository.save(card);

    return CardResponse.from(savedCard);
  }

  public List<CardResponse> getCardsByColumn(
      User user,
      Long boardId,
      Long columnId
  ) {
    Board board = getBoardById(boardId);
    validateBoardAccess(board, user);

    BoardColumn boardColumn = getColumnById(columnId);
    validateColumnInBoard(boardColumn, board);

    return cardRepository.findByBoardColumnOrderByRankAsc(boardColumn)
        .stream()
        .map(CardResponse::from)
        .toList();
  }

  public CardResponse getCardDetail(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    return CardResponse.from(card);
  }

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

    return CardResponse.from(card);
  }

  @Transactional
  public void deleteCard(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    cardRepository.delete(card);
  }

  private String createSimpleRank(BoardColumn boardColumn) {
    long count = cardRepository.countByBoardColumn(boardColumn);

    return String.format("%010d", count + 1);
  }

  private Board getBoardById(Long boardId) {
    return boardRepository.findById(boardId)
        .orElseThrow(() -> new CustomException(ErrorCode.BOARD_NOT_FOUND));
  }

  private BoardColumn getColumnById(Long columnId) {
    return boardColumnRepository.findById(columnId)
        .orElseThrow(() -> new CustomException(ErrorCode.COLUMN_NOT_FOUND));
  }

  private Card getCardById(Long cardId) {
    return cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));
  }

  private void validateBoardAccess(Board board, User user) {
    boolean hasAccess = boardMemberRepository.existsByBoardAndUser(board, user);

    if (!hasAccess) {
      throw new CustomException(ErrorCode.BOARD_ACCESS_DENIED);
    }
  }

  private void validateColumnInBoard(BoardColumn boardColumn, Board board) {
    if (!Objects.equals(boardColumn.getBoard().getId(), board.getId())) {
      throw new CustomException(ErrorCode.COLUMN_NOT_FOUND);
    }
  }
}