package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTag;
import com.example.flow_board.domain.card.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardTagRepository extends JpaRepository<CardTag, Long> {

  List<CardTag> findByCardOrderByCreatedAtAsc(Card card);

  List<CardTag> findByTag(Tag tag);

  Optional<CardTag> findByCardAndTag(Card card, Tag tag);

  boolean existsByCardAndTag(Card card, Tag tag);
}