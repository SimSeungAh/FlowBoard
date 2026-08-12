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
   * 해당 선이 속한 보드
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
   *
   * 예:
   * #000000
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
   *
   * 예:
   * [
   *   {"x":10.0,"y":20.0},
   *   {"x":11.5,"y":22.0}
   * ]
   */
  @Lob
  @Column(
      name = "points_json",
      nullable = false,
      columnDefinition = "LONGTEXT"
  )
  private String pointsJson;

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
    this.user = user;
    this.clientStrokeId = clientStrokeId;
    this.tool = tool;
    this.color = color;
    this.lineWidth = lineWidth;
    this.pointsJson = pointsJson;
  }
}