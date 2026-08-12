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

@Service
@RequiredArgsConstructor
public class CardDependencyCleanupService {

  private final CardAssigneeRepository cardAssigneeRepository;
  private final CardTagRepository cardTagRepository;
  private final CommentRepository commentRepository;
  private final ChecklistRepository checklistRepository;
  private final ChecklistItemRepository checklistItemRepository;

  /**
   * 카드 삭제 전에 카드에 연결된 자식 데이터를
   * FK 의존 순서에 맞춰 먼저 제거합니다.
   *
   * 삭제 순서:
   *
   * CardAssignee
   * CardTag
   * Comment
   * ChecklistItem
   * Checklist
   * Card
   *
   * Card 자체 삭제는 이 서비스가 아닌
   * CardService 또는 BoardDependencyCleanupService에서
   * 처리합니다.
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
            .findByCardOrderByCreatedAtAsc(
                card
            )
    );

    /*
     * 카드 태그 연결 삭제
     */
    cardTagRepository.deleteAll(
        cardTagRepository
            .findByCardOrderByCreatedAtAsc(
                card
            )
    );

    /*
     * 카드 댓글 삭제
     */
    commentRepository.deleteAll(
        commentRepository
            .findByCardOrderByCreatedAtAsc(
                card
            )
    );

    /*
     * 체크리스트에는 다시 ChecklistItem이
     * 연결돼 있으므로 항목을 먼저 삭제합니다.
     */
    List<Checklist> checklists =
        checklistRepository
            .findByCardOrderByPositionAsc(
                card
            );

    for (Checklist checklist : checklists) {
      checklistItemRepository.deleteAll(
          checklistItemRepository
              .findByChecklistOrderByPositionAsc(
                  checklist
              )
      );
    }

    /*
     * 체크리스트 항목 삭제가 실제 DB에 먼저 반영되도록
     * flush 합니다.
     *
     * JpaRepository의 flush는 현재 트랜잭션의
     * EntityManager 전체 변경 사항을 반영합니다.
     */
    checklistItemRepository.flush();

    checklistRepository.deleteAll(
        checklists
    );

    /*
     * 카드 자체가 삭제되기 전에 모든 자식 데이터 삭제를
     * DB에 확실하게 반영합니다.
     */
    checklistRepository.flush();
  }
}