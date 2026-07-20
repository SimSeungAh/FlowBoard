package com.example.flow_board.domain.whiteboard.entity;

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
    name = "whiteboard_strokes",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_whiteboard_stroke_board_client",
            columnNames = {
                "board_id",
                "client_stroke_id"
            }
        )
    },
    indexes = {
        @Index(
            name = "idx_whiteboard_stroke_board",
            columnList = "board_id, id"
        )
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WhiteboardStroke extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  /**
   * 이 선이 그려진 보드
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(
      name = "board_id",
      nullable = false
  )
  private Board board;

  /**
   * 이 선을 그린 사용자
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(
      name = "user_id",
      nullable = false
  )
  private User user;

  /**
   * 프론트엔드에서 생성한 선의 고유 ID
   *
   * WebSocket 재연결 또는 중복 요청으로 동일한 선이 여러 번 저장되는 것을 막을 때 사용
   */
  @Column(
      name = "client_stroke_id",
      nullable = false,
      length = 36
  )
  private String clientStrokeId;

  /**
   * PEN 또는 ERASER
   */
  @Enumerated(EnumType.STRING)
  @Column(
      nullable = false,
      length = 20
  )
  private WhiteboardTool tool;

  /**
   * 펜의 색상
   *
   * 예:
   * #000000
   * #2563EB
   */
  @Column(
      nullable = false,
      length = 20
  )
  private String color;

  /**
   * 선 또는 지우개의 굵기
   */
  @Column(
      name = "line_width",
      nullable = false
  )
  private Integer lineWidth;

  /**
   * 선을 구성하는 좌표 목록을 JSON 문자열로 저장
   *
   * 저장 예:
   * [
   *   {"x":10.5,"y":20.0},
   *   {"x":11.2,"y":21.8}
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