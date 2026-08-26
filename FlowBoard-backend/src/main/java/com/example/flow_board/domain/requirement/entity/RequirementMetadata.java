package com.example.flow_board.domain.requirement.entity;

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
    name = "requirement_metadata",
    uniqueConstraints = @UniqueConstraint(name = "uk_requirement_metadata_card", columnNames = "card_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RequirementMetadata extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "card_id", nullable = false, unique = true)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Card card;

  @Enumerated(EnumType.STRING)
  @Column(name = "priority", nullable = false, length = 20)
  private RequirementPriority priority = RequirementPriority.MEDIUM;

  @Enumerated(EnumType.STRING)
  @Column(name = "approval_status", nullable = false, length = 30)
  private RequirementApprovalStatus approvalStatus = RequirementApprovalStatus.DRAFT;

  @Column(name = "source", length = 255)
  private String source;

  @Column(name = "target_version", length = 100)
  private String targetVersion;

  @Lob
  @Column(name = "acceptance_criteria")
  private String acceptanceCriteria;

  public RequirementMetadata(Card card) {
    this.card = card;
  }

  public void updatePriority(RequirementPriority priority) {
    this.priority = priority;
  }

  public void updateApprovalStatus(RequirementApprovalStatus approvalStatus) {
    this.approvalStatus = approvalStatus;
  }

  public void updateSource(String source) {
    this.source = source;
  }

  public void updateTargetVersion(String targetVersion) {
    this.targetVersion = targetVersion;
  }

  public void updateAcceptanceCriteria(String acceptanceCriteria) {
    this.acceptanceCriteria = acceptanceCriteria;
  }
}
