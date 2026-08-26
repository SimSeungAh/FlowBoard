package com.example.flow_board.domain.designreview.entity;

import com.example.flow_board.domain.card.entity.Card;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

@Entity
@Table(
    name = "design_review_metadata",
    uniqueConstraints = @UniqueConstraint(name = "uk_design_review_metadata_card", columnNames = "card_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DesignReviewMetadata extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "card_id", nullable = false, unique = true)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Card card;

  @Enumerated(EnumType.STRING)
  @Column(name = "review_status", nullable = false, length = 30)
  private DesignReviewStatus reviewStatus = DesignReviewStatus.PENDING;

  @Column(name = "design_url", length = 1000)
  private String designUrl;

  @Column(name = "review_scope", length = 1000)
  private String reviewScope;

  public DesignReviewMetadata(Card card) {
    this.card = card;
  }

  public void updateReviewStatus(DesignReviewStatus reviewStatus) {
    this.reviewStatus = reviewStatus;
  }

  public void updateDesignUrl(String designUrl) {
    this.designUrl = designUrl;
  }

  public void updateReviewScope(String reviewScope) {
    this.reviewScope = reviewScope;
  }
}
