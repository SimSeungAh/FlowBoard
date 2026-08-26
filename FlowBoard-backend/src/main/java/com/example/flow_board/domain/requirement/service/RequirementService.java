package com.example.flow_board.domain.requirement.service;

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
import com.example.flow_board.domain.requirement.dto.RequirementResponse;
import com.example.flow_board.domain.requirement.dto.RequirementUpdateRequest;
import com.example.flow_board.domain.requirement.entity.RequirementMetadata;
import com.example.flow_board.domain.requirement.repository.RequirementMetadataRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RequirementService {

  private final CardRepository cardRepository;
  private final BoardPermissionService boardPermissionService;
  private final RequirementMetadataRepository requirementMetadataRepository;
  private final ActivityLogService activityLogService;
  private final CardEventPublisher cardEventPublisher;

  public RequirementResponse getRequirement(User user, Long cardId) {
    Card card = getRequirementCard(cardId);
    Board board = card.getBoardColumn().getBoard();
    boardPermissionService.validateReadPermission(board, user);

    RequirementMetadata metadata = requirementMetadataRepository.findByCard_Id(cardId).orElse(null);
    return RequirementResponse.from(card, metadata);
  }

  @Transactional
  public RequirementResponse updateRequirement(
      User user,
      Long cardId,
      RequirementUpdateRequest request
  ) {
    Card card = getRequirementCard(cardId);
    Board board = card.getBoardColumn().getBoard();
    boardPermissionService.validateWritePermission(board, user);

    RequirementMetadata metadata = requirementMetadataRepository.findByCard_Id(cardId)
        .orElseGet(() -> new RequirementMetadata(card));

    boolean changed = false;

    if (request.priority() != null) {
      metadata.updatePriority(request.priority());
      changed = true;
    }

    if (request.approvalStatus() != null) {
      metadata.updateApprovalStatus(request.approvalStatus());
      changed = true;
    }

    if (request.source() != null) {
      metadata.updateSource(normalizeText(request.source(), 255));
      changed = true;
    }

    if (request.targetVersion() != null) {
      metadata.updateTargetVersion(normalizeText(request.targetVersion(), 100));
      changed = true;
    }

    if (request.acceptanceCriteria() != null) {
      metadata.updateAcceptanceCriteria(normalizeText(request.acceptanceCriteria(), 5000));
      changed = true;
    }

    if (!changed) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    RequirementMetadata saved = requirementMetadataRepository.save(metadata);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CARD_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname() + "님이 '" + card.getTitle() + "' 요구사항 정보를 수정했습니다."
    );

    cardEventPublisher.publish(
        CardWebSocketEvent.updated(
            board.getId(),
            CardResponse.from(card)
        )
    );

    return RequirementResponse.from(card, saved);
  }

  private Card getRequirementCard(Long cardId) {
    Card card = cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));

    if (card.getTaskType() != CardTaskType.REQUIREMENT) {
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
