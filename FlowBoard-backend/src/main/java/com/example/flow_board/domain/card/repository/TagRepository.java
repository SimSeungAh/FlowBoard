package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, Long> {
}