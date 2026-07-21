package com.example.flow_board.domain.activity.entity;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "activity_logs",
    indexes = {
        @Index(
            name = "idx_activity_log_board_created_at",
            columnList = "board_id, created_at"
        ),
        @Index(
            name = "idx_activity_log_actor",
            columnList = "actor_id"
        )
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActivityLog extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /**
   * 활동이 발생한 보드
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(
      name = "board_id",
      nullable = false
  )
  private Board board;

  /**
   * 활동을 수행한 사용자
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(
      name = "actor_id",
      nullable = false
  )
  private User actor;

  /**
   * 활동 종류
   */
  @Enumerated(EnumType.STRING)
  @Column(
      nullable = false,
      length = 50
  )
  private ActivityType type;

  /**
   * 활동 대상의 ID
   *
   * 예:
   * 카드 ID
   * 댓글 ID
   * 태그 ID
   * 보드 멤버 ID
   * 전체 삭제처럼 특정 대상이 없는 활동은 null이 될 수 있음
   */
  @Column(name = "target_id")
  private Long targetId;

  /**
   * 활동 대상의 이름을 당시 값으로 저장
   * 예:
   * "로그인 API 구현"
   * "백엔드"
   * "홍길동"
   *
   * 카드나 태그가 나중에 삭제되어도 활동 로그 내용을 확인할 수 있음
   */
  @Column(
      name = "target_name",
      length = 200
  )
  private String targetName;

  /**
   * 사용자 화면에 표시할 활동 내용
   * 예:
   * "홍길동님이 '로그인 API 구현' 카드를 생성했습니다."
   */
  @Column(
      nullable = false,
      length = 500
  )
  private String description;

  public ActivityLog(
      Board board,
      User actor,
      ActivityType type,
      Long targetId,
      String targetName,
      String description
  ) {
    this.board = board;
    this.actor = actor;
    this.type = type;
    this.targetId = targetId;
    this.targetName = targetName;
    this.description = description;
  }
}