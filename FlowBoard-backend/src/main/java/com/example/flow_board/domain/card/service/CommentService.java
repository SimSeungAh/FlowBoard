package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.card.dto.request.CommentCreateRequest;
import com.example.flow_board.domain.card.dto.request.CommentUpdateRequest;
import com.example.flow_board.domain.card.dto.response.CommentResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.Comment;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.repository.CommentRepository;
import com.example.flow_board.domain.card.websocket.CommentEventPublisher;
import com.example.flow_board.domain.card.websocket.CommentWebSocketEvent;
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
  private final CommentEventPublisher commentEventPublisher;
  private final ActivityLogService activityLogService;

  /**
   * 댓글 생성
   */
  @Transactional
  public CommentResponse createComment(
      User user,
      Long cardId,
      CommentCreateRequest request
  ) {
    Card card = getCardById(cardId);
    Board board = card
        .getBoardColumn()
        .getBoard();

    validateBoardAccess(
        board,
        user
    );

    Comment comment = new Comment(
        card,
        user,
        request.content()
    );

    Comment savedComment =
        commentRepository.save(comment);

    CommentResponse response =
        CommentResponse.from(savedComment);

    /*
     * 댓글과 활동 로그는 같은 트랜잭션에서 저장
     */
    activityLogService.recordActivity(
        board,
        user,
        ActivityType.COMMENT_CREATED,
        savedComment.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드에 댓글을 작성했습니다."
    );

    commentEventPublisher.publish(
        CommentWebSocketEvent.created(
            board.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 카드의 댓글 목록 조회
   */
  public List<CommentResponse> getComments(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    Board board = card
        .getBoardColumn()
        .getBoard();

    validateBoardAccess(
        board,
        user
    );

    return commentRepository
        .findByCardOrderByCreatedAtAsc(card)
        .stream()
        .map(CommentResponse::from)
        .toList();
  }

  /**
   * 댓글 수정
   */
  @Transactional
  public CommentResponse updateComment(
      User user,
      Long commentId,
      CommentUpdateRequest request
  ) {
    Comment comment =
        getCommentById(commentId);

    Card card = comment.getCard();

    Board board = card
        .getBoardColumn()
        .getBoard();

    validateBoardAccess(
        board,
        user
    );

    validateCommentOwner(
        comment,
        user
    );

    comment.updateContent(
        request.content()
    );

    CommentResponse response =
        CommentResponse.from(comment);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.COMMENT_UPDATED,
        comment.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드의 댓글을 수정했습니다."
    );

    commentEventPublisher.publish(
        CommentWebSocketEvent.updated(
            board.getId(),
            response
        )
    );

    return response;
  }

  /**
   * 댓글 삭제
   */
  @Transactional
  public void deleteComment(
      User user,
      Long commentId
  ) {
    Comment comment =
        getCommentById(commentId);

    Card card = comment.getCard();

    Board board = card
        .getBoardColumn()
        .getBoard();

    validateBoardAccess(
        board,
        user
    );

    validateCommentOwner(
        comment,
        user
    );

    /*
     * 댓글 삭제 후에도 이벤트와 활동 로그에 사용할 수 있도록 필요한 값을 먼저 보관
     */
    Long boardId =
        board.getId();

    Long cardId =
        card.getId();

    Long deletedCommentId =
        comment.getId();

    String cardTitle =
        card.getTitle();

    commentRepository.delete(comment);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.COMMENT_DELETED,
        deletedCommentId,
        cardTitle,
        user.getNickname()
            + "님이 '"
            + cardTitle
            + "' 카드의 댓글을 삭제했습니다."
    );

    commentEventPublisher.publish(
        CommentWebSocketEvent.deleted(
            boardId,
            cardId,
            deletedCommentId
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
   * 댓글 조회
   */
  private Comment getCommentById(
      Long commentId
  ) {
    return commentRepository
        .findById(commentId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.COMMENT_NOT_FOUND
            )
        );
  }

  /**
   * 사용자가 해당 보드의 멤버인지 검사
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
   * 댓글 작성자인지 검사
   */
  private void validateCommentOwner(
      Comment comment,
      User user
  ) {
    if (
        !Objects.equals(
            comment.getUser().getId(),
            user.getId()
        )
    ) {
      throw new CustomException(
          ErrorCode.COMMENT_ACCESS_DENIED
      );
    }
  }
}