package com.example.flow_board.domain.card.entity;

import com.example.flow_board.domain.board.entity.BoardColumn;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
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

  public Card(
      BoardColumn boardColumn,
      User createdBy,
      String title,
      String description,
      String rank,
      LocalDateTime dueDate
  ) {
    this.boardColumn = boardColumn;
    this.createdBy = createdBy;
    this.title = title;
    this.description = description;
    this.rank = rank;
    this.dueDate = dueDate;
  }

  public void update(String title, String description, LocalDateTime dueDate) {
    this.title = title;
    this.description = description;
    this.dueDate = dueDate;
  }

  public void moveTo(BoardColumn boardColumn, String rank) {
    this.boardColumn = boardColumn;
    this.rank = rank;
  }
}