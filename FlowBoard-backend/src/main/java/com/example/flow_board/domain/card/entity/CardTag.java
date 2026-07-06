package com.example.flow_board.domain.card.entity;

import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "card_tags",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_card_tag_card_tag",
            columnNames = {"card_id", "tag_id"}
        )
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CardTag extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "card_id", nullable = false)
  private Card card;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "tag_id", nullable = false)
  private Tag tag;

  public CardTag(Card card, Tag tag) {
    this.card = card;
    this.tag = tag;
  }
}