package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardAssignee;
import com.example.flow_board.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CardAssigneeRepository extends JpaRepository<CardAssignee, Long> {

  List<CardAssignee> findByCardOrderByCreatedAtAsc(Card card);

  Optional<CardAssignee> findByCardAndUser(Card card, User user);

  boolean existsByCardAndUser(Card card, User user);
}