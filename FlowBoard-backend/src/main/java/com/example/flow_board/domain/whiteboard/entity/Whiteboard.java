package com.example.flow_board.domain.whiteboard.entity;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "whiteboards",
    indexes = {
        @Index(name = "idx_whiteboards_board_position", columnList = "board_id, position"),
        @Index(name = "idx_whiteboards_board_default", columnList = "board_id, is_default")
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Whiteboard extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "board_id", nullable = false)
  private Board board;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(length = 500)
  private String description;

  @Column(nullable = false)
  private Integer position;

  @Column(name = "is_default", nullable = false, columnDefinition = "boolean default false")
  private boolean defaultWhiteboard;

  @Column(name = "background_color", nullable = false, length = 30,
      columnDefinition = "varchar(30) default '#FFFFFF'")
  private String backgroundColor = "#FFFFFF";

  /**
   * 기존 데이터 호환용 플래그입니다.
   * 신규 UI는 gridType을 기준으로 표시하고, 이 값은 NONE 여부와 함께 맞춰 둡니다.
   */
  @Column(name = "grid_enabled", nullable = false, columnDefinition = "boolean default true")
  private boolean gridEnabled = true;

  @Enumerated(EnumType.STRING)
  @Column(name = "grid_type", nullable = false, length = 20,
      columnDefinition = "varchar(20) default 'GRID'")
  private WhiteboardGridType gridType = WhiteboardGridType.GRID;

  @Column(name = "grid_size", nullable = false, columnDefinition = "integer default 24")
  private Integer gridSize = 24;

  @Column(name = "grid_opacity", nullable = false, columnDefinition = "double default 0.12")
  private Double gridOpacity = 0.12;

  @Column(name = "canvas_width", nullable = false, columnDefinition = "integer default 1200")
  private Integer canvasWidth = 1200;

  @Column(name = "canvas_height", nullable = false, columnDefinition = "integer default 700")
  private Integer canvasHeight = 700;

  @Column(name = "is_locked", nullable = false, columnDefinition = "boolean default false")
  private boolean locked = false;

  public Whiteboard(
      Board board,
      String title,
      String description,
      Integer position,
      boolean defaultWhiteboard
  ) {
    this.board = board;
    this.title = title;
    this.description = description;
    this.position = position;
    this.defaultWhiteboard = defaultWhiteboard;
    this.backgroundColor = "#FFFFFF";
    this.gridEnabled = true;
    this.gridType = WhiteboardGridType.GRID;
    this.gridSize = 24;
    this.gridOpacity = 0.12;
    this.canvasWidth = 1200;
    this.canvasHeight = 700;
    this.locked = false;
  }

  public void updateMetadata(String title, String description) {
    this.title = title;
    this.description = description;
  }

  public void updatePosition(Integer position) {
    this.position = position;
  }

  public void updateDefaultWhiteboard(boolean defaultWhiteboard) {
    this.defaultWhiteboard = defaultWhiteboard;
  }

  public void updateAppearance(
      String backgroundColor,
      WhiteboardGridType gridType,
      Integer gridSize,
      Double gridOpacity
  ) {
    this.backgroundColor = backgroundColor;
    this.gridType = gridType;
    this.gridEnabled = gridType != WhiteboardGridType.NONE;
    this.gridSize = gridSize;
    this.gridOpacity = gridOpacity;
  }

  public void updateCanvasSize(Integer canvasWidth, Integer canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  public void updateLocked(boolean locked) {
    this.locked = locked;
  }
}
