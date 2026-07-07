package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.board.repository.BoardMemberRepository;
import com.example.flow_board.domain.card.dto.request.ChecklistCreateRequest;
import com.example.flow_board.domain.card.dto.request.ChecklistItemCreateRequest;
import com.example.flow_board.domain.card.dto.request.ChecklistItemUpdateRequest;
import com.example.flow_board.domain.card.dto.request.ChecklistUpdateRequest;
import com.example.flow_board.domain.card.dto.response.ChecklistItemResponse;
import com.example.flow_board.domain.card.dto.response.ChecklistResponse;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.Checklist;
import com.example.flow_board.domain.card.entity.ChecklistItem;
import com.example.flow_board.domain.card.repository.CardRepository;
import com.example.flow_board.domain.card.repository.ChecklistItemRepository;
import com.example.flow_board.domain.card.repository.ChecklistRepository;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChecklistService {

  private final CardRepository cardRepository;
  private final ChecklistRepository checklistRepository;
  private final ChecklistItemRepository checklistItemRepository;
  private final BoardMemberRepository boardMemberRepository;

  @Transactional
  public ChecklistResponse createChecklist(
      User user,
      Long cardId,
      ChecklistCreateRequest request
  ) {
    Card card = getCardById(cardId);
    validateBoardAccess(card.getBoardColumn().getBoard(), user);

    int position = (int) checklistRepository.countByCard(card);

    Checklist checklist = new Checklist(
        card,
        request.title(),
        position
    );

    Checklist savedChecklist = checklistRepository.save(checklist);

    return ChecklistResponse.from(savedChecklist, List.of());
  }

  public List<ChecklistResponse> getChecklists(
      User user,
      Long cardId
  ) {
    Card card = getCardById(cardId);
    validateBoardAccess(card.getBoardColumn().getBoard(), user);

    return checklistRepository.findByCardOrderByPositionAsc(card)
        .stream()
        .map(this::toChecklistResponse)
        .toList();
  }

  @Transactional
  public ChecklistResponse updateChecklist(
      User user,
      Long checklistId,
      ChecklistUpdateRequest request
  ) {
    Checklist checklist = getChecklistById(checklistId);
    validateBoardAccess(checklist.getCard().getBoardColumn().getBoard(), user);

    checklist.updateTitle(request.title());

    return toChecklistResponse(checklist);
  }

  @Transactional
  public void deleteChecklist(
      User user,
      Long checklistId
  ) {
    Checklist checklist = getChecklistById(checklistId);
    validateBoardAccess(checklist.getCard().getBoardColumn().getBoard(), user);

    List<ChecklistItem> items = checklistItemRepository.findByChecklistOrderByPositionAsc(checklist);
    checklistItemRepository.deleteAll(items);

    checklistRepository.delete(checklist);
  }

  @Transactional
  public ChecklistItemResponse createChecklistItem(
      User user,
      Long checklistId,
      ChecklistItemCreateRequest request
  ) {
    Checklist checklist = getChecklistById(checklistId);
    validateBoardAccess(checklist.getCard().getBoardColumn().getBoard(), user);

    int position = (int) checklistItemRepository.countByChecklist(checklist);

    ChecklistItem item = new ChecklistItem(
        checklist,
        request.content(),
        position
    );

    ChecklistItem savedItem = checklistItemRepository.save(item);

    return ChecklistItemResponse.from(savedItem);
  }

  @Transactional
  public ChecklistItemResponse updateChecklistItem(
      User user,
      Long itemId,
      ChecklistItemUpdateRequest request
  ) {
    ChecklistItem item = getChecklistItemById(itemId);
    validateBoardAccess(item.getChecklist().getCard().getBoardColumn().getBoard(), user);

    item.updateContent(request.content());

    return ChecklistItemResponse.from(item);
  }

  @Transactional
  public ChecklistItemResponse toggleChecklistItem(
      User user,
      Long itemId
  ) {
    ChecklistItem item = getChecklistItemById(itemId);
    validateBoardAccess(item.getChecklist().getCard().getBoardColumn().getBoard(), user);

    item.toggleChecked();

    return ChecklistItemResponse.from(item);
  }

  @Transactional
  public void deleteChecklistItem(
      User user,
      Long itemId
  ) {
    ChecklistItem item = getChecklistItemById(itemId);
    validateBoardAccess(item.getChecklist().getCard().getBoardColumn().getBoard(), user);

    checklistItemRepository.delete(item);
  }

  private ChecklistResponse toChecklistResponse(Checklist checklist) {
    List<ChecklistItemResponse> items = checklistItemRepository
        .findByChecklistOrderByPositionAsc(checklist)
        .stream()
        .map(ChecklistItemResponse::from)
        .toList();

    return ChecklistResponse.from(checklist, items);
  }

  private Card getCardById(Long cardId) {
    return cardRepository.findById(cardId)
        .orElseThrow(() -> new CustomException(ErrorCode.CARD_NOT_FOUND));
  }

  private Checklist getChecklistById(Long checklistId) {
    return checklistRepository.findById(checklistId)
        .orElseThrow(() -> new CustomException(ErrorCode.CHECKLIST_NOT_FOUND));
  }

  private ChecklistItem getChecklistItemById(Long itemId) {
    return checklistItemRepository.findById(itemId)
        .orElseThrow(() -> new CustomException(ErrorCode.CHECKLIST_ITEM_NOT_FOUND));
  }

  private void validateBoardAccess(Board board, User user) {
    boolean hasAccess = boardMemberRepository.existsByBoardAndUser(board, user);

    if (!hasAccess) {
      throw new CustomException(ErrorCode.BOARD_ACCESS_DENIED);
    }
  }
}