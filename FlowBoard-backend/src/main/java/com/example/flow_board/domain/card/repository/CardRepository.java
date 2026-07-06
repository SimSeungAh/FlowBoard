package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Card;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardRepository extends JpaRepository<Card, Long> {
}