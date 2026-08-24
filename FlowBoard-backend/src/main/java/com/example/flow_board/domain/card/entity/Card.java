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

  /**
   * 일정/간트에서 사용하는 작업 시작일입니다.
   *
   * 시작일이 없고 마감일만 있는 기존 카드는
   * 일정 화면에서 마감 마일스톤으로 표현할 수 있습니다.
   */
  private LocalDateTime startDate;

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
   */
  @Column(
      name = "security_impact_scope",
      length = 255
  )
  private String securityImpactScope;

  /**
   * 보안 점검 카드에서만 사용하는 검증 상태입니다.
   */
  @Enumerated(EnumType.STRING)
  @Column(
      name = "security_verification_status",
      length = 30
  )
  private SecurityVerificationStatus securityVerificationStatus;

  /**
   * 기존 코드 호환용 생성자.
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
   * 기존 작업 유형 생성자와의 호환성을 유지합니다.
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
    this(
        boardColumn,
        createdBy,
        title,
        description,
        rank,
        null,
        dueDate,
        taskType,
        testCaseType,
        testCaseResult
    );
  }

  /**
   * 시작일과 마감일을 모두 포함한 일정용 카드 생성자입니다.
   */
  public Card(
      BoardColumn boardColumn,
      User createdBy,
      String title,
      String description,
      String rank,
      LocalDateTime startDate,
      LocalDateTime dueDate,
      CardTaskType taskType,
      TestCaseType testCaseType,
      TestCaseResult testCaseResult
  ) {
    validateSchedule(
        startDate,
        dueDate
    );

    this.boardColumn = boardColumn;
    this.createdBy = createdBy;
    this.title = title;
    this.description = description;
    this.rank = rank;
    this.startDate = startDate;
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
      LocalDateTime startDate,
      LocalDateTime dueDate
  ) {
    validateSchedule(
        startDate,
        dueDate
    );

    this.title = title;
    this.description = description;
    this.startDate = startDate;
    this.dueDate = dueDate;
  }

  public void moveTo(
      BoardColumn boardColumn,
      String rank
  ) {
    this.boardColumn = boardColumn;
    this.rank = rank;
  }

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

  public void updateSecurityImpactScope(
      String securityImpactScope
  ) {
    validateSecurityReviewCard();

    this.securityImpactScope =
        normalizeSecurityImpactScope(
            securityImpactScope
        );
  }

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

  public SecuritySeverity getSecuritySeverity() {
    if (taskType != CardTaskType.SECURITY_REVIEW) {
      return null;
    }

    return securitySeverity == null
        ? SecuritySeverity.MEDIUM
        : securitySeverity;
  }

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

  private void applyTaskMetadata(
      CardTaskType taskType,
      TestCaseType testCaseType,
      TestCaseResult testCaseResult
  ) {
    this.taskType =
        taskType == null
            ? CardTaskType.GENERAL
            : taskType;

    if (this.taskType != CardTaskType.TEST_CASE) {
      this.testCaseType = null;
      this.testCaseResult = null;
      return;
    }

    if (testCaseType == null) {
      throw new CustomException(
          ErrorCode.TEST_CASE_TYPE_REQUIRED
      );
    }

    this.testCaseType =
        testCaseType;

    this.testCaseResult =
        testCaseResult == null
            ? TestCaseResult.NOT_RUN
            : testCaseResult;
  }

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

  /**
   * 시작일이 마감일보다 늦는 잘못된 일정을 차단합니다.
   */
  private void validateSchedule(
      LocalDateTime startDate,
      LocalDateTime dueDate
  ) {
    if (
        startDate != null &&
            dueDate != null &&
            startDate.isAfter(dueDate)
    ) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT
      );
    }
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