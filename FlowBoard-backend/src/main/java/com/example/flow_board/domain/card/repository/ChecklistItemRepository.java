package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.ChecklistItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistItemRepository extends JpaRepository<ChecklistItem, Long> {
}