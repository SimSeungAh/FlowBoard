package com.example.flow_board.domain.card.entity;

import com.example.flow_board.domain.board.entity.Board;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name="tags",
    uniqueConstraints = {
        @UniqueConstraint(
            name="uk_tag_board_name",
            columnNames = {"board_id","name"}
        )
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "board_id", nullable = false)
  private Board board;

  @Column(nullable = false, length = 30)
  private String name;

  @Column(nullable = false, length = 20)
  private String color;

  public Tag(Board board, String name, String color) {
    this.board = board;
    this.name = name;
    this.color = color;
  }

  public void updateTag(String name, String color) {
    this.name = name;
    this.color = color;
  }

}
