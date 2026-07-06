package com.example.flow_board.domain.board.entity;

import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name="boards")
@NoArgsConstructor(access= AccessLevel.PROTECTED)
public class Board extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch=FetchType.LAZY)
  @JoinColumn(name="owner_id", nullable = false)
  private User owner;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(length = 500)
  private String description;

  @Column(length = 500)
  private String backgroundColor;

  public Board(User owner, String title, String description) {
    this.owner = owner;
    this.title = title;
    this.description = description;
    this.backgroundColor = "white";
  }

  public void update(String title, String description, String backgroundColor) {
    this.title = title;
    this.description = description;
    this.backgroundColor = backgroundColor;
  }
}
