package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.CardTag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CardTagRepository extends JpaRepository<CardTag, Long> {
}