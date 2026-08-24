package com.example.flow_board.domain.whiteboard.entity;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
        @Index(
            name = "idx_whiteboards_board_position",
            columnList = "board_id, position"
        ),
        @Index(
            name = "idx_whiteboards_board_default",
            columnList = "board_id, is_default"
        )
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

  @Column(
      name = "is_default",
      nullable = false,
      columnDefinition = "boolean default false"
  )
  private boolean defaultWhiteboard;

  @Column(
      name = "background_color",
      nullable = false,
      length = 30,
      columnDefinition = "varchar(30) default '#FFFFFF'"
  )
  private String backgroundColor = "#FFFFFF";

  @Column(
      name = "grid_enabled",
      nullable = false,
      columnDefinition = "boolean default true"
  )
  private boolean gridEnabled = true;

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
  }

  public void updateMetadata(
      String title,
      String description
  ) {
    this.title = title;
    this.description = description;
  }

  public void updatePosition(Integer position) {
    this.position = position;
  }

  public void updateDefaultWhiteboard(
      boolean defaultWhiteboard
  ) {
    this.defaultWhiteboard = defaultWhiteboard;
  }

  public void updateAppearance(
      String backgroundColor,
      boolean gridEnabled
  ) {
    this.backgroundColor = backgroundColor;
    this.gridEnabled = gridEnabled;
  }
}