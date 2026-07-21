package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardAssignee;
import com.example.flow_board.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CardAssigneeRepository
    extends JpaRepository<CardAssignee, Long> {

  /**
   * 특정 카드에 등록된 담당자를 등록 순서대로 조회
   */
  List<CardAssignee> findByCardOrderByCreatedAtAsc(
      Card card
  );

  /**
   * 특정 카드와 사용자에 해당하는 담당자 연결 정보를 조회
   */
  Optional<CardAssignee> findByCardAndUser(
      Card card,
      User user
  );

  /**
   * 특정 사용자가 이미 카드 담당자로 ㅜ등록되어 있는지 확인
   */
  boolean existsByCardAndUser(
      Card card,
      User user
  );

  /**
   * 여러 카드의 담당자를 한 번에 조회
   * 담당자 응답을 만들 때 User 정보가 필요하므로 fetch join으로 User까지 함께 조회
   */
  @Query("""
      select cardAssignee
      from CardAssignee cardAssignee
      join fetch cardAssignee.user
      where cardAssignee.card.id in :cardIds
      order by cardAssignee.card.id asc,
               cardAssignee.createdAt asc
      """)
  List<CardAssignee> findAllByCardIdsWithUser(
      @Param("cardIds") List<Long> cardIds
  );
}