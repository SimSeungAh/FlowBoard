package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.CardAssignee;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardAssigneeRepository extends JpaRepository<CardAssignee, Long> {
}