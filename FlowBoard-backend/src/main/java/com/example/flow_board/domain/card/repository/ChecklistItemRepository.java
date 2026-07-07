package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Checklist;
import com.example.flow_board.domain.card.entity.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {

  List<ChecklistItem> findByChecklistOrderByPositionAsc(Checklist checklist);

  long countByChecklist(Checklist checklist);
}