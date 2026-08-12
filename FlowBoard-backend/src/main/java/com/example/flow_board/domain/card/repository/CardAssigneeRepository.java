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
   * 카드 담당자 목록 조회
   */
  List<CardAssignee> findByCardOrderByCreatedAtAsc(
      Card card
  );

  /**
   * 특정 카드와 사용자의 담당자 연결 조회
   */
  Optional<CardAssignee> findByCardAndUser(
      Card card,
      User user
  );

  /**
   * 이미 담당자로 지정돼 있는지 확인
   */
  boolean existsByCardAndUser(
      Card card,
      User user
  );

  /**
   * 여러 카드의 담당자를 한 번에 조회합니다.
   *
   * user를 fetch join해서 검색 결과 DTO 변환 시
   * 사용자마다 추가 쿼리가 발생하지 않도록 합니다.
   */
  @Query("""
      select ca
      from CardAssignee ca
      join fetch ca.user
      where ca.card.id in :cardIds
      order by ca.card.id asc, ca.createdAt asc
      """)
  List<CardAssignee> findAllByCardIdsWithUser(
      @Param("cardIds")
      List<Long> cardIds
  );
}