package com.example.flow_board.domain.card.entity;

import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "checklists")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Checklist extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "card_id", nullable = false)
  private Card card;

  @Column(nullable = false, length = 100)
  private String title;

  @Column(nullable = false)
  private Integer position;

  public Checklist(Card card, String title, Integer position) {
    this.card = card;
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