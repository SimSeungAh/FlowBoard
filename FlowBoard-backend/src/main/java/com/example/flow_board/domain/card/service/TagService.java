package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.board.repository.BoardRepository;
import com.example.flow_board.domain.card.dto.request.TagCreateRequest;
import com.example.flow_board.domain.card.dto.request.TagUpdateRequest;
import com.example.flow_board.domain.card.dto.response.TagResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTag;
import com.example.flow_board.domain.card.entity.Tag;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.repository.CardTagRepository;
import com.example.flow_board.domain.card.repository.TagRepository;
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
public class TagService {

  private final BoardRepository boardRepository;
  private final BoardMemberRepository boardMemberRepository;
  private final CardRepository cardRepository;
  private final TagRepository tagRepository;
  private final CardTagRepository cardTagRepository;

  @Transactional
  public TagResponse createTag(
      User user,
      Long boardId,
      TagCreateRequest request
  ) {
    Board board = getBoardById(boardId);
    validateBoardAccess(board, user);

    if (tagRepository.existsByBoardAndName(board, request.name())) {
      throw new CustomException(ErrorCode.TAG_ALREADY_EXISTS);
    }

    Tag tag = new Tag(
        board,
        request.name(),
        request.color()
    );

    Tag savedTag = tagRepository.save(tag);

    return TagResponse.from(savedTag);
  }

  public List<TagResponse> getBoardTags(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);
    validateBoardAccess(board, user);

    return tagRepository.findByBoardOrderByCreatedAtAsc(board)
        .stream()
        .map(TagResponse::from)
        .toList();
  }

  @Transactional
  public TagResponse updateTag(
      User user,
      Long tagId,
      TagUpdateRequest request
  ) {
    Tag tag = getTagById(tagId);
    Board board = tag.getBoard();

    validateBoardAccess(board, user);

    tagRepository.findByBoardAndName(board, request.name())
        .ifPresent(existingTag -> {
          if (!Objects.equals(existingTag.getId(), tag.getId())) {
            throw new CustomException(ErrorCode.TAG_ALREADY_EXISTS);
          }
        });

    tag.updateTag(
        request.name(),
        request.color()
    );

    return TagResponse.from(tag);
  }

  @Transactional
  public void deleteTag(
      User user,
      Long tagId
  ) {
    Tag tag = getTagById(tagId);
    Board board = tag.getBoard();

    validateBoardAccess(board, user);

    List<CardTag> cardTags = cardTagRepository.findByTag(tag);
    cardTagRepository.deleteAll(cardTags);

    tagRepository.delete(tag);
  }

  @Transactional
  public TagResponse addTagToCard(
      User user,
      Long cardId,
      Long tagId
  ) {
    Card card = getCardById(cardId);
    Tag tag = getTagById(tagId);

    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);
    validateTagInBoard(tag, board);

    if (cardTagRepository.existsByCardAndTag(card, tag)) {
      throw new CustomException(ErrorCode.TAG_ALREADY_EXISTS);
    }

    CardTag cardTag = new CardTag(card, tag);
    cardTagRepository.save(cardTag);

    return TagResponse.from(tag);
  }

  public List<TagResponse> getCardTags(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);

    return cardTagRepository.findByCardOrderByCreatedAtAsc(card)
        .stream()
        .map(cardTag -> TagResponse.from(cardTag.getTag()))
        .toList();
  }

  @Transactional
  public void removeTagFromCard(
      User user,
      Long cardId,
      Long tagId
  ) {
    Card card = getCardById(cardId);
    Tag tag = getTagById(tagId);

    Board board = card.getBoardColumn().getBoard();

    validateBoardAccess(board, user);
    validateTagInBoard(tag, board);

    CardTag cardTag = cardTagRepository.findByCardAndTag(card, tag)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_TAG_NOT_FOUND));

    cardTagRepository.delete(cardTag);
  }

  private Board getBoardById(Long boardId) {
    return boardRepository.findById(boardId)
        .orElseThrow(() -> new CustomException(ErrorCode.BOARD_NOT_FOUND));
  }

  private Card getCardById(Long cardId) {
    return cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));
  }

  private Tag getTagById(Long tagId) {
    return tagRepository.findById(tagId)
        .orElseThrow(() -> new CustomException(ErrorCode.TAG_NOT_FOUND));
  }

  private void validateBoardAccess(Board board, User user) {
    boolean hasAccess = boardMemberRepository.existsByBoardAndUser(board, user);

    if (!hasAccess) {
      throw new CustomException(ErrorCode.BOARD_ACCESS_DENIED);
    }
  }

  private void validateTagInBoard(Tag tag, Board board) {
    if (!Objects.equals(tag.getBoard().getId(), board.getId())) {
      throw new CustomException(ErrorCode.TAG_NOT_FOUND);
    }
  }
}