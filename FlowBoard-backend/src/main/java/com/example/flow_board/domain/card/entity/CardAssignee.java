package com.example.flow_board.domain.card.entity;

import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "card_assignees",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_card_assignee_card_user",
            columnNames = {"card_id", "user_id"}
        )
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CardAssignee extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name="card_id", nullable = false)
  private Card card;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name="user_id", nullable = false)
  private User user;

  public CardAssignee(Card card, User user) {
    this.card = card;
    this.user = user;
  }
}
