package com.example.flow_board.domain.board.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "board_columns")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BoardColumn {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name="board_id", nullable = false)
  private Board board;

  @Column(nullable = false, length = 50)
  private String title;

  @Column(nullable = false)
  private Integer position;

  /**
   * 이 컬럼을 프로젝트의 "완료 단계"로 볼지 여부입니다.
   *
   * 컬럼 이름과 완료 의미를 분리해두면
   * "완료", "Done", "배포 완료"처럼 팀마다 다른 이름을 사용해도
   * 대시보드 완료율 / 지연 계산 / 번다운 등의 기준을 정확히 잡을 수 있습니다.
   */
  @Column(
      name = "is_completion_column",
      nullable = false,
      columnDefinition = "boolean default false"
  )
  private boolean completionColumn = false;

  public BoardColumn(Board board, String title, Integer position) {
    this.board = board;
    this.title = title;
    this.position = position;

    /*
     * 새 보드의 기본 "완료" 컬럼은
     * 처음부터 완료 단계로 자동 지정합니다.
     *
     * 이후 OWNER가 워크플로우 설정에서
     * 자유롭게 변경할 수 있습니다.
     */
    this.completionColumn =
        "완료".equals(
            title == null
                ? null
                : title.trim()
        );
  }

  public void updateTitle(String title) {
    this.title = title;
  }

  public void updatePosition(Integer position) {
    this.position = position;
  }

  public void updateCompletionColumn(boolean completionColumn) {
    this.completionColumn = completionColumn;
  }

}