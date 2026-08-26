package com.example.flow_board.domain.releasecheck.service;

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
import com.example.flow_board.domain.releasecheck.dto.ReleaseCheckResponse;
import com.example.flow_board.domain.releasecheck.dto.ReleaseCheckUpdateRequest;
import com.example.flow_board.domain.releasecheck.entity.ReleaseCheckMetadata;
import com.example.flow_board.domain.releasecheck.repository.ReleaseCheckMetadataRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReleaseCheckService {

  private final CardRepository cardRepository;
  private final BoardPermissionService boardPermissionService;
  private final ReleaseCheckMetadataRepository releaseCheckMetadataRepository;
  private final ActivityLogService activityLogService;
  private final CardEventPublisher cardEventPublisher;

  public ReleaseCheckResponse getReleaseCheck(User user, Long cardId) {
    Card card = getReleaseCheckCard(cardId);
    Board board = card.getBoardColumn().getBoard();
    boardPermissionService.validateReadPermission(board, user);

    ReleaseCheckMetadata metadata = releaseCheckMetadataRepository.findByCard_Id(cardId).orElse(null);
    return ReleaseCheckResponse.from(card, metadata);
  }

  @Transactional
  public ReleaseCheckResponse updateReleaseCheck(
      User user,
      Long cardId,
      ReleaseCheckUpdateRequest request
  ) {
    Card card = getReleaseCheckCard(cardId);
    Board board = card.getBoardColumn().getBoard();
    boardPermissionService.validateWritePermission(board, user);

    ReleaseCheckMetadata metadata = releaseCheckMetadataRepository.findByCard_Id(cardId)
        .orElseGet(() -> new ReleaseCheckMetadata(card));

    boolean changed = false;

    if (request.releaseStatus() != null) {
      metadata.updateReleaseStatus(request.releaseStatus());
      changed = true;
    }
    if (request.targetEnvironment() != null) {
      metadata.updateTargetEnvironment(request.targetEnvironment());
      changed = true;
    }
    if (request.version() != null) {
      metadata.updateVersion(normalizeText(request.version(), 100));
      changed = true;
    }
    if (request.smokeTestStatus() != null) {
      metadata.updateSmokeTestStatus(request.smokeTestStatus());
      changed = true;
    }
    if (request.releaseNotes() != null) {
      metadata.updateReleaseNotes(normalizeText(request.releaseNotes(), 10000));
      changed = true;
    }
    if (request.rollbackPlan() != null) {
      metadata.updateRollbackPlan(normalizeText(request.rollbackPlan(), 10000));
      changed = true;
    }

    if (!changed) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    ReleaseCheckMetadata saved = releaseCheckMetadataRepository.save(metadata);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname() + "님이 '" + card.getTitle() + "' 릴리즈 체크 정보를 수정했습니다."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            CardResponse.from(card)
        )
    );

    return ReleaseCheckResponse.from(card, saved);
  }

  private Card getReleaseCheckCard(Long cardId) {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));

    if (card.getTaskType() != CardTaskType.RELEASE_CHECK) {
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
