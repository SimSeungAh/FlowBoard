package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.activity.entity.ActivityType;
import com.example.flow_board.domain.activity.service.ActivityLogService;
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
  private final ActivityLogService activityLogService;

  /**
   * 체크리스트 생성
   */
  @Transactional
  public ChecklistResponse createChecklist(
      User user,
      Long cardId,
      ChecklistCreateRequest request
  ) {
    Card card = getCardById(cardId);

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    int position =
        (int) checklistRepository.countByCard(card);

    Checklist checklist = new Checklist(
        card,
        request.title(),
        position
    );

    Checklist savedChecklist =
        checklistRepository.save(checklist);

    ChecklistResponse response =
        ChecklistResponse.from(
            savedChecklist,
            List.of()
        );

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CHECKLIST_CREATED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드에 '"
            + savedChecklist.getTitle()
            + "' 체크리스트를 생성했습니다."
    );

    return response;
  }

  /**
   * 카드의 체크리스트 목록 조회
   */
  public List<ChecklistResponse> getChecklists(
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

    return checklistRepository
        .findByCardOrderByPositionAsc(card)
        .stream()
        .map(this::toChecklistResponse)
        .toList();
  }

  /**
   * 체크리스트 제목 수정
   */
  @Transactional
  public ChecklistResponse updateChecklist(
      User user,
      Long checklistId,
      ChecklistUpdateRequest request
  ) {
    Checklist checklist =
        getChecklistById(checklistId);

    Card card =
        checklist.getCard();

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    checklist.updateTitle(
        request.title()
    );

    ChecklistResponse response =
        toChecklistResponse(checklist);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CHECKLIST_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드의 '"
            + checklist.getTitle()
            + "' 체크리스트를 수정했습니다."
    );

    return response;
  }

  /**
   * 체크리스트 삭제
   */
  @Transactional
  public void deleteChecklist(
      User user,
      Long checklistId
  ) {
    Checklist checklist =
        getChecklistById(checklistId);

    Card card =
        checklist.getCard();

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    String checklistTitle =
        checklist.getTitle();

    List<ChecklistItem> items =
        checklistItemRepository
            .findByChecklistOrderByPositionAsc(
                checklist
            );

    checklistItemRepository.deleteAll(
        items
    );

    checklistRepository.delete(
        checklist
    );

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CHECKLIST_DELETED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드의 '"
            + checklistTitle
            + "' 체크리스트를 삭제했습니다."
    );
  }

  /**
   * 체크리스트 항목 생성
   */
  @Transactional
  public ChecklistItemResponse createChecklistItem(
      User user,
      Long checklistId,
      ChecklistItemCreateRequest request
  ) {
    Checklist checklist =
        getChecklistById(checklistId);

    Card card =
        checklist.getCard();

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    int position =
        (int) checklistItemRepository
            .countByChecklist(checklist);

    ChecklistItem item =
        new ChecklistItem(
            checklist,
            request.content(),
            position
        );

    ChecklistItem savedItem =
        checklistItemRepository.save(item);

    ChecklistItemResponse response =
        ChecklistItemResponse.from(
            savedItem
        );

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CHECKLIST_ITEM_CREATED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드의 '"
            + checklist.getTitle()
            + "' 체크리스트에 '"
            + savedItem.getContent()
            + "' 항목을 추가했습니다."
    );

    return response;
  }

  /**
   * 체크리스트 항목 내용 수정
   */
  @Transactional
  public ChecklistItemResponse updateChecklistItem(
      User user,
      Long itemId,
      ChecklistItemUpdateRequest request
  ) {
    ChecklistItem item =
        getChecklistItemById(itemId);

    Checklist checklist =
        item.getChecklist();

    Card card =
        checklist.getCard();

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    item.updateContent(
        request.content()
    );

    ChecklistItemResponse response =
        ChecklistItemResponse.from(item);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CHECKLIST_ITEM_UPDATED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드의 체크리스트 항목을 '"
            + item.getContent()
            + "'(으)로 수정했습니다."
    );

    return response;
  }

  /**
   * 체크리스트 항목 완료 상태 변경
   */
  @Transactional
  public ChecklistItemResponse toggleChecklistItem(
      User user,
      Long itemId
  ) {
    ChecklistItem item =
        getChecklistItemById(itemId);

    Checklist checklist =
        item.getChecklist();

    Card card =
        checklist.getCard();

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    item.toggleChecked();

    ChecklistItemResponse response =
        ChecklistItemResponse.from(item);

    String action =
        item.isChecked()
            ? "완료 처리했습니다."
            : "완료를 취소했습니다.";

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CHECKLIST_ITEM_TOGGLED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드의 '"
            + item.getContent()
            + "' 항목을 "
            + action
    );

    return response;
  }

  /**
   * 체크리스트 항목 삭제
   */
  @Transactional
  public void deleteChecklistItem(
      User user,
      Long itemId
  ) {
    ChecklistItem item =
        getChecklistItemById(itemId);

    Checklist checklist =
        item.getChecklist();

    Card card =
        checklist.getCard();

    Board board =
        card.getBoardColumn().getBoard();

    validateBoardAccess(
        board,
        user
    );

    String itemContent =
        item.getContent();

    checklistItemRepository.delete(item);

    activityLogService.recordActivity(
        board,
        user,
        ActivityType.CHECKLIST_ITEM_DELETED,
        card.getId(),
        card.getTitle(),
        user.getNickname()
            + "님이 '"
            + card.getTitle()
            + "' 카드의 '"
            + itemContent
            + "' 체크리스트 항목을 삭제했습니다."
    );
  }

  /**
   * 체크리스트 응답 생성
   */
  private ChecklistResponse toChecklistResponse(
      Checklist checklist
  ) {
    List<ChecklistItemResponse> items =
        checklistItemRepository
            .findByChecklistOrderByPositionAsc(
                checklist
            )
            .stream()
            .map(ChecklistItemResponse::from)
            .toList();

    return ChecklistResponse.from(
        checklist,
        items
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
   * 체크리스트 조회
   */
  private Checklist getChecklistById(
      Long checklistId
  ) {
    return checklistRepository
        .findById(checklistId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.CHECKLIST_NOT_FOUND
            )
        );
  }

  /**
   * 체크리스트 항목 조회
   */
  private ChecklistItem getChecklistItemById(
      Long itemId
  ) {
    return checklistItemRepository
        .findById(itemId)
        .orElseThrow(
            () -> new CustomException(
                ErrorCode.CHECKLIST_ITEM_NOT_FOUND
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
}