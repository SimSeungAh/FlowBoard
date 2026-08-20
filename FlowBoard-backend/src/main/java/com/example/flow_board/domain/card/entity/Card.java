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
  public void updateTestCase(
      TestCaseType testCaseType,
      TestCaseResult testCaseResult
  ) {
    if (taskType != CardTaskType.TEST_CASE) {
      throw new IllegalStateException(
          "테스트 케이스 카드만 테스트 정보를 수정할 수 있습니다."
      );
    }

    if (testCaseType != null) {
      this.testCaseType = testCaseType;
    }

    if (testCaseResult != null) {
      this.testCaseResult = testCaseResult;
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
     * 테스트 케이스인데 별도 값이 전달되지 않으면
     * 가장 기본적인 상태로 시작합니다.
     */
    this.testCaseType =
        testCaseType == null
            ? TestCaseType.NORMAL
            : testCaseType;

    this.testCaseResult =
        testCaseResult == null
            ? TestCaseResult.NOT_RUN
            : testCaseResult;
  }
}