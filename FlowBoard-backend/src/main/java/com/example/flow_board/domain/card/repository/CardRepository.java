package com.example.flow_board.domain.card.repository;

import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.domain.card.entity.CardTaskType;
import com.example.flow_board.domain.card.entity.SecuritySeverity;
import com.example.flow_board.domain.card.entity.SecurityVerificationStatus;
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

  /**
   * 보드의 보안 점검 카드 목록을 조회합니다.
   *
   * - SECURITY_REVIEW 카드만 조회
   * - 심각도 필터
   * - 검증 상태 필터
   * - 제목/설명/영향 범위 검색
   * - Pageable 기반 페이지네이션
   *
   * 기존 SECURITY_REVIEW 카드 중
   * 새 보안 메타데이터 컬럼 추가 전에 생성되어
   * securitySeverity가 null인 카드는
   * MEDIUM으로 취급합니다.
   *
   * securityVerificationStatus가 null인 기존 카드는
   * PENDING으로 취급합니다.
   */
  @Query("""
      select c
      from Card c
      where c.boardColumn.board.id = :boardId
        and c.taskType = :taskType
        and (
          :securitySeverity is null
          or c.securitySeverity = :securitySeverity
          or (
            :securitySeverity = :defaultSeverity
            and c.securitySeverity is null
          )
        )
        and (
          :verificationStatus is null
          or c.securityVerificationStatus = :verificationStatus
          or (
            :verificationStatus = :defaultVerificationStatus
            and c.securityVerificationStatus is null
          )
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
          or lower(
              coalesce(c.securityImpactScope, '')
          ) like lower(
              concat('%', :keyword, '%')
          )
        )
      """)
  Page<Card> findSecurityReviews(
      @Param("boardId")
      Long boardId,

      @Param("taskType")
      CardTaskType taskType,

      @Param("securitySeverity")
      SecuritySeverity securitySeverity,

      @Param("defaultSeverity")
      SecuritySeverity defaultSeverity,

      @Param("verificationStatus")
      SecurityVerificationStatus verificationStatus,

      @Param("defaultVerificationStatus")
      SecurityVerificationStatus defaultVerificationStatus,

      @Param("keyword")
      String keyword,

      Pageable pageable
  );

  /**
   * 보드의 특정 작업 유형 카드 개수 조회
   *
   * 테스트 케이스 및 보안 점검 전체 개수 집계에 사용합니다.
   */
  long countByBoardColumn_Board_IdAndTaskType(
      Long boardId,
      CardTaskType taskType
  );

  /**
   * 보드의 특정 작업 유형 + 테스트 결과별 카드 개수 조회
   */
  long countByBoardColumn_Board_IdAndTaskTypeAndTestCaseResult(
      Long boardId,
      CardTaskType taskType,
      TestCaseResult testCaseResult
  );

  /**
   * 보안 점검 심각도별 개수 조회
   *
   * 기존 SECURITY_REVIEW 카드의 securitySeverity가
   * null인 경우 기본값 MEDIUM으로 집계합니다.
   */
  @Query("""
      select count(c)
      from Card c
      where c.boardColumn.board.id = :boardId
        and c.taskType = :taskType
        and (
          c.securitySeverity = :securitySeverity
          or (
            :securitySeverity = :defaultSeverity
            and c.securitySeverity is null
          )
        )
      """)
  long countSecurityReviewsBySeverity(
      @Param("boardId")
      Long boardId,

      @Param("taskType")
      CardTaskType taskType,

      @Param("securitySeverity")
      SecuritySeverity securitySeverity,

      @Param("defaultSeverity")
      SecuritySeverity defaultSeverity
  );

  /**
   * 보안 점검 검증 상태별 개수 조회
   *
   * 기존 SECURITY_REVIEW 카드의
   * securityVerificationStatus가 null인 경우
   * 기본값 PENDING으로 집계합니다.
   */
  @Query("""
      select count(c)
      from Card c
      where c.boardColumn.board.id = :boardId
        and c.taskType = :taskType
        and (
          c.securityVerificationStatus = :verificationStatus
          or (
            :verificationStatus = :defaultVerificationStatus
            and c.securityVerificationStatus is null
          )
        )
      """)
  long countSecurityReviewsByVerificationStatus(
      @Param("boardId")
      Long boardId,

      @Param("taskType")
      CardTaskType taskType,

      @Param("verificationStatus")
      SecurityVerificationStatus verificationStatus,

      @Param("defaultVerificationStatus")
      SecurityVerificationStatus defaultVerificationStatus
  );
}