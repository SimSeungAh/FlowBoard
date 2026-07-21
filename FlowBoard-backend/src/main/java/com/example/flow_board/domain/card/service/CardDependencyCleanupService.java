package com.example.flow_board.domain.card.service;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.Checklist;
import com.example.flow_board.domain.card.repository.CardAssigneeRepository;
import com.example.flow_board.domain.card.repository.CardTagRepository;
import com.example.flow_board.domain.card.repository.ChecklistItemRepository;
import com.example.flow_board.domain.card.repository.ChecklistRepository;
import com.example.flow_board.domain.card.repository.CommentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 카드를 삭제하기 전에 카드가 참조하는 하위 데이터를 안전하게 정리하는 서비스
 * 카드 단건 삭제와 보드 전체 삭제에서 공통으로 사용할 예정
 */
@Service
@RequiredArgsConstructor
public class CardDependencyCleanupService {

  private final CardAssigneeRepository cardAssigneeRepository;
  private final CardTagRepository cardTagRepository;
  private final CommentRepository commentRepository;
  private final ChecklistRepository checklistRepository;
  private final ChecklistItemRepository checklistItemRepository;

  /**
   * 카드에 연결된 하위 데이터를 모두 삭제
   * 이 메서드에서는 Card 자체는 삭제하지 않음
   */
  @Transactional
  public void deleteDependencies(
      Card card
  ) {
    /*
     * 카드 담당자 연결 삭제
     */
    cardAssigneeRepository.deleteAll(
        cardAssigneeRepository
            .findByCardOrderByCreatedAtAsc(card)
    );

    /*
     * 카드 태그 연결 삭제
     */
    cardTagRepository.deleteAll(
        cardTagRepository
            .findByCardOrderByCreatedAtAsc(card)
    );

    /*
     * 댓글 삭제
     */
    commentRepository.deleteAll(
        commentRepository
            .findByCardOrderByCreatedAtAsc(card)
    );

    /*
     * 체크리스트 항목은 체크리스트보다 먼저 삭제
     */
    List<Checklist> checklists =
        checklistRepository
            .findByCardOrderByPositionAsc(card);

    for (Checklist checklist : checklists) {
      checklistItemRepository.deleteAll(
          checklistItemRepository
              .findByChecklistOrderByPositionAsc(
                  checklist
              )
      );
    }

    /*
     * 체크리스트 항목 삭제 후 체크리스트 자체를 삭제
     */
    checklistRepository.deleteAll(
        checklists
    );

    /*
     * 카드 삭제 전에 지금까지의 하위 데이터 삭제를 DB에 먼저 반영해 외래키 충돌을 방지
     * 같은 영속성 컨텍스트의 변경 사항이 모두 flush 됨
     */
    checklistRepository.flush();
  }
}