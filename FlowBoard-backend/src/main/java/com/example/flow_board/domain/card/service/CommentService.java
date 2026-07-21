package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.service.BoardPermissionService;
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
  private final BoardPermissionService boardPermissionService;
  private final CommentEventPublisher commentEventPublisher;
  private final ActivityLogService activityLogService;

  /**
   * 댓글 생성
   *
   * OWNER와 MEMBER만 가능합니다.
   */
  @Transactional
  public CommentResponse createComment(
      User user,
      Long cardId,
      CommentCreateRequest request
  ) {
    Card card = getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateWritePermission(
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
   *
   * OWNER, MEMBER, VIEWER 모두 가능합니다.
   */
  public List<CommentResponse> getComments(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateReadPermission(
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
   *
   * OWNER와 MEMBER 중에서도
   * 댓글 작성자 본인만 가능합니다.
   */
  @Transactional
  public CommentResponse updateComment(
      User user,
      Long commentId,
      CommentUpdateRequest request
  ) {
    Comment comment =
        getCommentById(commentId);

    Card card =
        comment.getCard();

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateWritePermission(
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
   *
   * OWNER와 MEMBER 중에서도
   * 댓글 작성자 본인만 가능합니다.
   */
  @Transactional
  public void deleteComment(
      User user,
      Long commentId
  ) {
    Comment comment =
        getCommentById(commentId);

    Card card =
        comment.getCard();

    Board board =
        card.getBoardColumn()
            .getBoard();

    boardPermissionService.validateWritePermission(
        board,
        user
    );

    validateCommentOwner(
        comment,
        user
    );

    /*
     * 댓글 삭제 후에도 활동 로그와
     * WebSocket 이벤트에 사용할 값을 보관합니다.
     */
    Long boardId =
        board.getId();

    Long cardId =
        card.getId();

    Long deletedCommentId =
        comment.getId();

    String cardTitle =
        card.getTitle();

    commentRepository.delete(
        comment
    );

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