package com.example.flow_board.domain.card.entity;

import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Getter
@Entity
@Table(name = "cards")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Card extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "column_id", nullable = false)
  private BoardColumn boardColumn;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by", nullable = false)
  private User createdBy;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "sort_rank", nullable = false, length = 50)
  private String rank;

  private LocalDateTime dueDate;

  /**
   * 카드가 어떤 형태의 작업인지 나타냅니다.
   *
   * Frontend / Backend / Mobile처럼
   * 직군을 구분하는 값이 아니라,
   * 일반 작업 / 버그 / 테스트 케이스처럼
   * 카드의 작업 형식을 나타냅니다.
   */
  @Enumerated(EnumType.STRING)
  @Column(
      name = "task_type",
      nullable = false,
      length = 30,
      columnDefinition = "varchar(30) default 'GENERAL'"
  )
  private CardTaskType taskType = CardTaskType.GENERAL;

  /**
   * 테스트 케이스 카드에서만 사용합니다.
   *
   * 일반 카드에서는 null입니다.
   */
  @Enumerated(EnumType.STRING)
  @Column(
      name = "test_case_type",
      length = 30
  )
  private TestCaseType testCaseType;

  /**
   * 테스트 케이스 카드에서만 사용합니다.
   *
   * 최초 생성 시 NOT_RUN입니다.
   */
  @Enumerated(EnumType.STRING)
  @Column(
      name = "test_case_result",
      length = 30
  )
  private TestCaseResult testCaseResult;

  /**
   * 보안 점검 카드에서만 사용하는 심각도입니다.
   *
   * 신규 보안 점검 카드는 MEDIUM으로 시작합니다.
   */
  @Enumerated(EnumType.STRING)
  @Column(
      name = "security_severity",
      length = 20
  )
  private SecuritySeverity securitySeverity;

  /**
   * 보안 점검 카드에서만 사용하는 영향 범위입니다.
   *
   * 예:
   * Web Platform /api/auth/login
   */
  @Column(
      name = "security_impact_scope",
      length = 255
  )
  private String securityImpactScope;

  /**
   * 보안 점검 카드에서만 사용하는 검증 상태입니다.
   *
   * 신규 보안 점검 카드는 PENDING으로 시작합니다.
   */
  @Enumerated(EnumType.STRING)
  @Column(
      name = "security_verification_status",
      length = 30
  )
  private SecurityVerificationStatus securityVerificationStatus;

  /**
   * 기존 카드 생성 로직과의 호환성을 유지하기 위한 생성자입니다.
   *
   * 기존 코드에서 이 생성자를 사용하면
   * 일반 작업(GENERAL)으로 생성됩니다.
   */
  public Card(
      BoardColumn boardColumn,
      User createdBy,
      String title,
      String description,
      String rank,
      LocalDateTime dueDate
  ) {
    this(
        boardColumn,
        createdBy,
        title,
        description,
        rank,
        dueDate,
        CardTaskType.GENERAL,
        null,
        null
    );
  }

  /**
   * 작업 유형을 포함한 카드 생성자입니다.
   */
  public Card(
      BoardColumn boardColumn,
      User createdBy,
      String title,
      String description,
      String rank,
      LocalDateTime dueDate,
      CardTaskType taskType,
      TestCaseType testCaseType,
      TestCaseResult testCaseResult
  ) {
    this.boardColumn = boardColumn;
    this.createdBy = createdBy;
    this.title = title;
    this.description = description;
    this.rank = rank;
    this.dueDate = dueDate;

    applyTaskMetadata(
        taskType,
        testCaseType,
        testCaseResult
    );

    applySecurityMetadata();
  }

  public void update(
      String title,
      String description,
      LocalDateTime dueDate
  ) {
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
  }

  public void moveTo(
      BoardColumn boardColumn,
      String rank
  ) {
    this.boardColumn = boardColumn;
    this.rank = rank;
  }

  /**
   * 테스트 케이스의 유형과 결과를 수정합니다.
   *
   * 테스트 케이스가 아닌 카드에는 사용할 수 없습니다.
   */
  public void updateTestCaseType(
      TestCaseType testCaseType
  ) {
    validateTestCaseCard();

    if (testCaseType == null) {
      throw new CustomException(
          ErrorCode.TEST_CASE_TYPE_REQUIRED
      );
    }

    this.testCaseType =
        testCaseType;
  }

  public void updateTestCaseResult(
      TestCaseResult testCaseResult
  ) {
    validateTestCaseCard();

    if (testCaseResult == null) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    this.testCaseResult =
        testCaseResult;
  }

  /**
   * 보안 점검 심각도를 변경합니다.
   */
  public void updateSecuritySeverity(
      SecuritySeverity securitySeverity
  ) {
    validateSecurityReviewCard();

    if (securitySeverity == null) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    this.securitySeverity =
        securitySeverity;
  }

  /**
   * 보안 점검 영향 범위를 변경합니다.
   *
   * 공백만 전달되면 미설정(null)으로 정리합니다.
   */
  public void updateSecurityImpactScope(
      String securityImpactScope
  ) {
    validateSecurityReviewCard();

    this.securityImpactScope =
        normalizeSecurityImpactScope(
            securityImpactScope
        );
  }

  /**
   * 보안 점검 검증 상태를 변경합니다.
   */
  public void updateSecurityVerificationStatus(
      SecurityVerificationStatus securityVerificationStatus
  ) {
    validateSecurityReviewCard();

    if (securityVerificationStatus == null) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }

    this.securityVerificationStatus =
        securityVerificationStatus;
  }

  /**
   * 기존 SECURITY_REVIEW 카드에 새 컬럼 값이 아직 없더라도
   * 화면에서는 기본 심각도 MEDIUM으로 처리할 수 있도록 합니다.
   */
  public SecuritySeverity getSecuritySeverity() {
    if (taskType != CardTaskType.SECURITY_REVIEW) {
      return null;
    }

    return securitySeverity == null
        ? SecuritySeverity.MEDIUM
        : securitySeverity;
  }

  /**
   * 기존 SECURITY_REVIEW 카드에 새 컬럼 값이 아직 없더라도
   * 화면에서는 기본 검증 상태 PENDING으로 처리할 수 있도록 합니다.
   */
  public SecurityVerificationStatus getSecurityVerificationStatus() {
    if (taskType != CardTaskType.SECURITY_REVIEW) {
      return null;
    }

    return securityVerificationStatus == null
        ? SecurityVerificationStatus.PENDING
        : securityVerificationStatus;
  }

  private void validateTestCaseCard() {
    if (
        taskType !=
            CardTaskType.TEST_CASE
    ) {
      throw new CustomException(
          ErrorCode.CARD_NOT_TEST_CASE
      );
    }
  }

  private void validateSecurityReviewCard() {
    if (
        taskType !=
            CardTaskType.SECURITY_REVIEW
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }
  }

  /**
   * 카드의 작업 메타데이터를 초기화합니다.
   */
  private void applyTaskMetadata(
      CardTaskType taskType,
      TestCaseType testCaseType,
      TestCaseResult testCaseResult
  ) {
    /*
     * 이전 프론트나 외부 클라이언트가 taskType을 생략해도
     * 기존 카드 생성 흐름이 깨지지 않도록 GENERAL로 처리합니다.
     */
    this.taskType =
        taskType == null
            ? CardTaskType.GENERAL
            : taskType;

    /*
     * 테스트 케이스가 아니면
     * 테스트 전용 필드를 사용하지 않습니다.
     */
    if (this.taskType != CardTaskType.TEST_CASE) {
      this.testCaseType = null;
      this.testCaseResult = null;
      return;
    }

    /*
     * 테스트 케이스는 반드시 세부 유형을 가져야 합니다.
     * 프론트에서는 기본값 NORMAL을 선택해서 전달하고,
     * 잘못된 외부 요청은 백엔드에서 차단합니다.
     */
    if (testCaseType == null) {
      throw new CustomException(
          ErrorCode.TEST_CASE_TYPE_REQUIRED
      );
    }

    this.testCaseType =
        testCaseType;

    /*
     * 테스트 결과는 최초 생성 시 미실행(NOT_RUN)입니다.
     */
    this.testCaseResult =
        testCaseResult == null
            ? TestCaseResult.NOT_RUN
            : testCaseResult;
  }

  /**
   * 보안 점검 전용 메타데이터를 초기화합니다.
   */
  private void applySecurityMetadata() {
    if (this.taskType != CardTaskType.SECURITY_REVIEW) {
      this.securitySeverity = null;
      this.securityImpactScope = null;
      this.securityVerificationStatus = null;
      return;
    }

    this.securitySeverity =
        SecuritySeverity.MEDIUM;

    this.securityImpactScope =
        null;

    this.securityVerificationStatus =
        SecurityVerificationStatus.PENDING;
  }

  private String normalizeSecurityImpactScope(
      String securityImpactScope
  ) {
    if (securityImpactScope == null) {
      return null;
    }

    String normalized =
        securityImpactScope.trim();

    return normalized.isEmpty()
        ? null
        : normalized;
  }
}