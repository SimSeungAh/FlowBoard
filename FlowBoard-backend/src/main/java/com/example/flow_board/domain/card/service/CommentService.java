package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.card.dto.request.CommentCreateRequest;
import com.example.flow_board.domain.card.dto.request.CommentUpdateRequest;
import com.example.flow_board.domain.card.dto.response.CommentResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.Comment;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.repository.CommentRepository;
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
public class CommentService {

  private final CardRepository cardRepository;
  private final CommentRepository commentRepository;
  private final BoardMemberRepository boardMemberRepository;

  @Transactional
  public CommentResponse createComment(
      User user,
      Long cardId,
      CommentCreateRequest request
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    Comment comment = new Comment(
        card,
        user,
        request.content()
    );

    Comment savedComment = commentRepository.save(comment);

    return CommentResponse.from(savedComment);
  }

  public List<CommentResponse> getComments(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    return commentRepository.findByCardOrderByCreatedAtAsc(card)
        .stream()
        .map(CommentResponse::from)
        .toList();
  }

  @Transactional
  public CommentResponse updateComment(
      User user,
      Long commentId,
      CommentUpdateRequest request
  ) {
    Comment comment = getCommentById(commentId);
    Board board = comment.getCard().getBoardColumn().getBoard();

    validateBoardAccess(board, user);
    validateCommentOwner(comment, user);

    comment.updateContent(request.content());

    return CommentResponse.from(comment);
  }

  @Transactional
  public void deleteComment(
      User user,
      Long commentId
  ) {
    Comment comment = getCommentById(commentId);
    Board board = comment.getCard().getBoardColumn().getBoard();

    validateBoardAccess(board, user);
    validateCommentOwner(comment, user);

    commentRepository.delete(comment);
  }

  private Card getCardById(Long cardId) {
    return cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));
  }

  private Comment getCommentById(Long commentId) {
    return commentRepository.findById(commentId)
        .orElseThrow(() -> new CustomException(ErrorCode.COMMENT_NOT_FOUND));
  }

  private void validateBoardAccess(Board board, User user) {
    boolean hasAccess = boardMemberRepository.existsByBoardAndUser(board, user);

    if (!hasAccess) {
      throw new CustomException(ErrorCode.BOARD_ACCESS_DENIED);
    }
  }

  private void validateCommentOwner(Comment comment, User user) {
    if (!Objects.equals(comment.getUser().getId(), user.getId())) {
      throw new CustomException(ErrorCode.COMMENT_ACCESS_DENIED);
    }
  }
}