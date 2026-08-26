package com.example.flow_board.domain.designreview.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.service.BoardPermissionService;
import com.example.flow_board.domain.card.dto.response.CardResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.websocket.CardEventPublisher;
import com.example.flow_board.domain.card.websocket.CardWebSocketEvent;
import com.example.flow_board.domain.designreview.dto.DesignReviewResponse;
import com.example.flow_board.domain.designreview.dto.DesignReviewUpdateRequest;
import com.example.flow_board.domain.designreview.entity.DesignReviewMetadata;
import com.example.flow_board.domain.designreview.repository.DesignReviewMetadataRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DesignReviewService {

  private final CardRepository cardRepository;
  private final BoardPermissionService boardPermissionService;
  private final DesignReviewMetadataRepository designReviewMetadataRepository;
  private final ActivityLogService activityLogService;
  private final CardEventPublisher cardEventPublisher;

  public DesignReviewResponse getDesignReview(User user, Long cardId) {
    Card card = getDesignReviewCard(cardId);
    Board board = card.getBoardColumn().getBoard();
    boardPermissionService.validateReadPermission(board, user);

    DesignReviewMetadata metadata = designReviewMetadataRepository.findByCard_Id(cardId).orElse(null);
    return DesignReviewResponse.from(card, metadata);
  }

  @Transactional
  public DesignReviewResponse updateDesignReview(
      User user,
      Long cardId,
      DesignReviewUpdateRequest request
  ) {
    Card card = getDesignReviewCard(cardId);
    Board board = card.getBoardColumn().getBoard();
    boardPermissionService.validateWritePermission(board, user);

    DesignReviewMetadata metadata = designReviewMetadataRepository.findByCard_Id(cardId)
        .orElseGet(() -> new DesignReviewMetadata(card));

    boolean changed = false;

    if (request.reviewStatus() != null) {
      metadata.updateReviewStatus(request.reviewStatus());
      changed = true;
    }

    if (request.designUrl() != null) {
      metadata.updateDesignUrl(normalizeText(request.designUrl(), 1000));
      changed = true;
    }

    if (request.reviewScope() != null) {
      metadata.updateReviewScope(normalizeText(request.reviewScope(), 1000));
      changed = true;
    }

    if (!changed) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    DesignReviewMetadata saved = designReviewMetadataRepository.save(metadata);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname() + "님이 '" + card.getTitle() + "' 디자인 리뷰 정보를 수정했습니다."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            CardResponse.from(card)
        )
    );

    return DesignReviewResponse.from(card, saved);
  }

  private Card getDesignReviewCard(Long cardId) {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));

    if (card.getTaskType() != CardTaskType.DESIGN_REVIEW) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return card;
  }

  private String normalizeText(String value, int maxLength) {
    String normalized = value.trim();

    if (normalized.length() > maxLength) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return normalized.isEmpty() ? null : normalized;
  }
}
