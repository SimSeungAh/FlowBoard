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

  public BoardColumn(Board board, String title, Integer position) {
    this.board = board;
    this.title = title;
    this.position = position;
  }

  public void updateTitle(String title) {
    this.title = title;
  }
  public void updatePosition(Integer position) {
    this.position = position;
  }

}
