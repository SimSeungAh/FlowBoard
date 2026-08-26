package com.example.flow_board.domain.requirement.repository;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface RequirementCardRepository extends JpaRepository<Card, Long> {

  @Query("""
      select c
      from Card c
      join fetch c.boardColumn bc
      where bc.board.id = :boardId
        and c.taskType = :taskType
        and (
          :keyword is null
          or lower(c.title) like lower(concat('%', :keyword, '%'))
          or lower(coalesce(c.description, '')) like lower(concat('%', :keyword, '%'))
        )
      order by c.updatedAt desc, c.id desc
      """)
  List<Card> findRequirements(
      @Param("boardId") Long boardId,
      @Param("taskType") CardTaskType taskType,
      @Param("keyword") String keyword
  );
}
