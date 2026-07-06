package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Checklist;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChecklistRepository extends JpaRepository<Checklist, Long> {
}