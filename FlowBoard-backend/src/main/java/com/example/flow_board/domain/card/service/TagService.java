package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
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
  private final ActivityLogService activityLogService;

  /**
   * 보드 태그 생성
   */
  @Transactional
  public TagResponse createTag(
      User user,
      Long boardId,
      TagCreateRequest request
  ) {
    Board board = getBoardById(boardId);

    validateBoardAccess(
        board,
        user
    );

    boolean alreadyExists =
        tagRepository.existsByBoardAndName(
            board,
            request.name()
        );

    if (alreadyExists) {
      throw new CustomException(
          ErrorCode.TAG_ALREADY_EXISTS
      );
    }

    Tag tag = new Tag(
        board,
        request.name(),
        request.color()
    );

    Tag savedTag =
        tagRepository.save(tag);

    TagResponse response =
        TagResponse.from(savedTag);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.TAG_CREATED,
        savedTag.getId(),
        savedTag.getName(),
        user.getNickname()
            + "님이 '"
            + savedTag.getName()
            + "' 태그를 생성했습니다."
    );

    return response;
  }

  /**
   * 보드 태그 목록 조회
   */
  public List<TagResponse> getBoardTags(
      User user,
      Long boardId
  ) {
    Board board = getBoardById(boardId);

    validateBoardAccess(
        board,
        user
    );

    return tagRepository
        .findByBoardOrderByCreatedAtAsc(board)
        .stream()
        .map(TagResponse::from)
        .toList();
  }

  /**
   * 태그 수정
   */
  @Transactional
  public TagResponse updateTag(
      User user,
      Long tagId,
      TagUpdateRequest request
  ) {
    Tag tag = getTagById(tagId);
    Board board = tag.getBoard();

    validateBoardAccess(
        board,
        user
    );

    tagRepository
        .findByBoardAndName(
            board,
            request.name()
        )
        .ifPresent(existingTag -> {
          if (
              !Objects.equals(
                  existingTag.getId(),
                  tag.getId()
              )
          ) {
            throw new CustomException(
                ErrorCode.TAG_ALREADY_EXISTS
            );
          }
        });

    String oldTagName =
        tag.getName();

    tag.updateTag(
        request.name(),
        request.color()
    );

    TagResponse response =
        TagResponse.from(tag);

    String description;

    if (
        Objects.equals(
            oldTagName,
            tag.getName()
        )
    ) {
      description =
          user.getNickname()
              + "님이 '"
              + tag.getName()
              + "' 태그를 수정했습니다.";
    } else {
      description =
          user.getNickname()
              + "님이 태그 이름을 '"
              + oldTagName
              + "'에서 '"
              + tag.getName()
              + "'(으)로 변경했습니다.";
    }

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.TAG_UPDATED,
        tag.getId(),
        tag.getName(),
        description
    );

    return response;
  }

  /**
   * 태그 삭제
   */
  @Transactional
  public void deleteTag(
      User user,
      Long tagId
  ) {
    Tag tag = getTagById(tagId);
    Board board = tag.getBoard();

    validateBoardAccess(
        board,
        user
    );

    Long deletedTagId =
        tag.getId();

    String deletedTagName =
        tag.getName();

    /*
     * 해당 태그와 카드 사이의 연결 정보를 먼저 모두 삭제
     */
    List<CardTag> cardTags =
        cardTagRepository.findByTag(tag);

    cardTagRepository.deleteAll(
        cardTags
    );

    tagRepository.delete(tag);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.TAG_DELETED,
        deletedTagId,
        deletedTagName,
        user.getNickname()
            + "님이 '"
            + deletedTagName
            + "' 태그를 삭제했습니다."
    );
  }

  /**
   * 카드에 태그 연결
   */
  @Transactional
  public TagResponse addTagToCard(
      User user,
      Long cardId,
      Long tagId
  ) {
    Card card = getCardById(cardId);
    Tag tag = getTagById(tagId);

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    validateTagInBoard(
        tag,
        board
    );

    boolean alreadyExists =
        cardTagRepository.existsByCardAndTag(
            card,
            tag
        );

    if (alreadyExists) {
      throw new CustomException(
          ErrorCode.TAG_ALREADY_EXISTS
      );
    }

    CardTag cardTag =
        new CardTag(
            card,
            tag
        );

    cardTagRepository.save(cardTag);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_TAG_ADDED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드에 '"
            + tag.getName()
            + "' 태그를 추가했습니다."
    );

    return TagResponse.from(tag);
  }

  /**
   * 카드 태그 목록 조회
   */
  public List<TagResponse> getCardTags(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    return cardTagRepository
        .findByCardOrderByCreatedAtAsc(card)
        .stream()
        .map(cardTag ->
            TagResponse.from(
                cardTag.getTag()
            )
        )
        .toList();
  }

  /**
   * 카드에서 태그 연결 해제
   */
  @Transactional
  public void removeTagFromCard(
      User user,
      Long cardId,
      Long tagId
  ) {
    Card card = getCardById(cardId);
    Tag tag = getTagById(tagId);

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    validateTagInBoard(
        tag,
        board
    );

    CardTag cardTag =
        cardTagRepository
            .findByCardAndTag(
                card,
                tag
            )
            .orElseThrow(
                () -> new CustomException(
                    ErrorCode.CARD_TAG_NOT_FOUND
                )
            );

    String cardTitle =
        card.getTitle();

    String tagName =
        tag.getName();

    cardTagRepository.delete(cardTag);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_TAG_REMOVED,
        card.getId(),
        cardTitle,
        user.getNickname()
            + "님이 '"
            + cardTitle
            + "' 카드에서 '"
            + tagName
            + "' 태그를 제거했습니다."
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
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.BOARD_NOT_FOUND
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
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.CARD_NOT_FOUND
            )
        );
  }

  /**
   * 태그 조회
   */
  private Tag getTagById(
      Long tagId
  ) {
    return tagRepository
        .findById(tagId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.TAG_NOT_FOUND
            )
        );
  }

  /**
   * 보드 접근 권한 검사
   */
  private void validateBoardAccess(
      Board board,
      User user
  ) {
    boolean hasAccess =
        boardMemberRepository
            .existsByBoardAndUser(
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
   * 태그가 카드와 같은 보드에 속하는지 검사
   */
  private void validateTagInBoard(
      Tag tag,
      Board board
  ) {
    if (
        !Objects.equals(
            tag.getBoard().getId(),
            board.getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.TAG_NOT_FOUND
      );
    }
  }
}