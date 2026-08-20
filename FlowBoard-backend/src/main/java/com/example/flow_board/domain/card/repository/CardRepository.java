package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.entity.TestCaseResult;
import com.example.flow_board.domain.card.entity.TestCaseType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CardRepository
    extends JpaRepository<Card, Long>,
    CardSearchRepository {

  /**
   * 특정 컬럼의 카드를 LexoRank 순서로 조회합니다.
   */
  List<Card> findByBoardColumnOrderByRankAsc(
      BoardColumn boardColumn
  );

  /**
   * 특정 컬럼의 카드 개수를 조회합니다.
   */
  long countByBoardColumn(
      BoardColumn boardColumn
  );

  /**
   * 특정 컬럼에서 가장 뒤에 있는 카드를 조회합니다.
   *
   * 새 카드 생성 시 마지막 카드 뒤의
   * LexoRank를 계산하기 위해 사용합니다.
   */
  Optional<Card> findTopByBoardColumnOrderByRankDesc(
      BoardColumn boardColumn
  );

  /**
   * 보드의 테스트 케이스를 조회합니다.
   *
   * - TEST_CASE 카드만 조회
   * - 테스트 유형 필터
   * - 테스트 결과 필터
   * - 제목/설명 검색
   * - Pageable 기반 페이지네이션
   */
  @Query("""
      select c
      from Card c
      where c.boardColumn.board.id = :boardId
        and c.taskType = :taskType
        and (
          :testCaseType is null
          or c.testCaseType = :testCaseType
        )
        and (
          :testCaseResult is null
          or c.testCaseResult = :testCaseResult
        )
        and (
          :keyword is null
          or lower(c.title) like lower(
              concat('%', :keyword, '%')
          )
          or lower(
              coalesce(c.description, '')
          ) like lower(
              concat('%', :keyword, '%')
          )
        )
      """)
  Page<Card> findTestCases(
      @Param("boardId")
      Long boardId,

      @Param("taskType")
      CardTaskType taskType,

      @Param("testCaseType")
      TestCaseType testCaseType,

      @Param("testCaseResult")
      TestCaseResult testCaseResult,

      @Param("keyword")
      String keyword,

      Pageable pageable
  );
}