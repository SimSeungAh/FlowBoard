package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.card.dto.request.CardAssigneeAddRequest;
import com.example.flow_board.domain.card.dto.response.CardAssigneeResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardAssignee;
import com.example.flow_board.domain.card.repository.CardAssigneeRepository;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.user.repository.UserRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CardAssigneeService {

  private final CardRepository cardRepository;
  private final CardAssigneeRepository cardAssigneeRepository;
  private final UserRepository userRepository;
  private final BoardMemberRepository boardMemberRepository;

  @Transactional
  public CardAssigneeResponse addAssignee(
      User loginUser,
      Long cardId,
      CardAssigneeAddRequest request
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, loginUser);

    User assignee = getUserById(request.userId());
    validateAssigneeIsBoardMember(board, assignee);

    if (cardAssigneeRepository.existsByCardAndUser(card, assignee)) {
      throw new CustomException(ErrorCode.CARD_ASSIGNEE_ALREADY_EXISTS);
    }

    CardAssignee cardAssignee = new CardAssignee(card, assignee);
    CardAssignee savedCardAssignee = cardAssigneeRepository.save(cardAssignee);

    return CardAssigneeResponse.from(savedCardAssignee);
  }

  public List<CardAssigneeResponse> getAssignees(
      User loginUser,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, loginUser);

    return cardAssigneeRepository.findByCardOrderByCreatedAtAsc(card)
        .stream()
        .map(CardAssigneeResponse::from)
        .toList();
  }

  @Transactional
  public void removeAssignee(
      User loginUser,
      Long cardId,
      Long userId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, loginUser);

    User assignee = getUserById(userId);

    CardAssignee cardAssignee = cardAssigneeRepository.findByCardAndUser(card, assignee)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_ASSIGNEE_NOT_FOUND));

    cardAssigneeRepository.delete(cardAssignee);
  }

  private Card getCardById(Long cardId) {
    return cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));
  }

  private User getUserById(Long userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateBoardAccess(Board board, User user) {
    boolean hasAccess = boardMemberRepository.existsByBoardAndUser(board, user);

    if (!hasAccess) {
      throw new CustomException(ErrorCode.BOARD_ACCESS_DENIED);
    }
  }

  private void validateAssigneeIsBoardMember(Board board, User assignee) {
    boolean isBoardMember = boardMemberRepository.existsByBoardAndUser(board, assignee);

    if (!isBoardMember) {
      throw new CustomException(ErrorCode.ASSIGNEE_NOT_BOARD_MEMBER);
    }
  }
}