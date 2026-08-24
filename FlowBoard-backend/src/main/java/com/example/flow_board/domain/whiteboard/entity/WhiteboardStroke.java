package com.example.flow_board.domain.whiteboard.entity;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "whiteboard_strokes",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_whiteboard_board_client_stroke",
            columnNames = {
                "board_id",
                "client_stroke_id"
            }
        )
    },
    indexes = {
        @Index(
            name = "idx_whiteboard_board_id",
            columnList = "board_id, id"
        ),
        @Index(
            name = "idx_whiteboard_workspace_id",
            columnList = "whiteboard_id, id"
        )
    }
)
@Getter
@NoArgsConstructor(
    access = AccessLevel.PROTECTED
)
public class WhiteboardStroke
    extends BaseEntity {

  @Id
  @GeneratedValue(
      strategy = GenerationType.IDENTITY
  )
  private Long id;

  /**
   * Stroke가 속한 보드.
   *
   * 기존 단일 화이트보드 구조와의 호환성 및
   * 보드 단위 정리 작업을 위해 유지합니다.
   */
  @ManyToOne(
      fetch = FetchType.LAZY,
      optional = false
  )
  @JoinColumn(
      name = "board_id",
      nullable = false
  )
  private Board board;

  /**
   * Stroke가 실제로 속한 화이트보드 작업 공간.
   *
   * 기존 데이터에는 whiteboard_id가 없으므로
   * 마이그레이션이 끝날 때까지 nullable로 유지합니다.
   *
   * WhiteboardService가 기존 Stroke를 최초 접근 시
   * 기본 화이트보드에 자동 연결합니다.
   */
  @ManyToOne(
      fetch = FetchType.LAZY
  )
  @JoinColumn(
      name = "whiteboard_id"
  )
  private Whiteboard whiteboard;

  /**
   * 선을 그린 사용자
   */
  @ManyToOne(
      fetch = FetchType.LAZY,
      optional = false
  )
  @JoinColumn(
      name = "user_id",
      nullable = false
  )
  private User user;

  /**
   * 프론트에서 생성한 선 고유 ID
   *
   * WebSocket 재전송이나 네트워크 중복 요청 시
   * 동일 선이 DB에 두 번 저장되는 것을 방지합니다.
   */
  @Column(
      name = "client_stroke_id",
      nullable = false,
      length = 36
  )
  private String clientStrokeId;

  /**
   * PEN / ERASER
   */
  @Enumerated(
      EnumType.STRING
  )
  @Column(
      name = "tool",
      nullable = false,
      length = 20
  )
  private WhiteboardTool tool;

  /**
   * HEX 색상
   */
  @Column(
      name = "color",
      nullable = false,
      length = 20
  )
  private String color;

  /**
   * 선 굵기
   */
  @Column(
      name = "line_width",
      nullable = false
  )
  private Integer lineWidth;

  /**
   * Canvas 좌표 목록 JSON
   */
  @Lob
  @Column(
      name = "points_json",
      nullable = false,
      columnDefinition = "LONGTEXT"
  )
  private String pointsJson;

  /**
   * 기존 코드 호환용 생성자.
   *
   * 아직 workspace를 지정하지 않는 레거시 코드가 있어도
   * 컴파일이 깨지지 않도록 유지합니다.
   */
  public WhiteboardStroke(
      Board board,
      User user,
      String clientStrokeId,
      WhiteboardTool tool,
      String color,
      Integer lineWidth,
      String pointsJson
  ) {
    this.board = board;
    this.whiteboard = null;
    this.user = user;
    this.clientStrokeId = clientStrokeId;
    this.tool = tool;
    this.color = color;
    this.lineWidth = lineWidth;
    this.pointsJson = pointsJson;
  }

  /**
   * 다중 화이트보드용 생성자.
   */
  public WhiteboardStroke(
      Whiteboard whiteboard,
      User user,
      String clientStrokeId,
      WhiteboardTool tool,
      String color,
      Integer lineWidth,
      String pointsJson
  ) {
    this.whiteboard = whiteboard;
    this.board = whiteboard.getBoard();
    this.user = user;
    this.clientStrokeId = clientStrokeId;
    this.tool = tool;
    this.color = color;
    this.lineWidth = lineWidth;
    this.pointsJson = pointsJson;
  }

  /**
   * 기존 단일 화이트보드 Stroke를
   * 기본 화이트보드 작업 공간으로 이전할 때 사용합니다.
   */
  public void assignWhiteboard(
      Whiteboard whiteboard
  ) {
    this.whiteboard = whiteboard;
    this.board = whiteboard.getBoard();
  }
}