package com.example.flow_board.domain.releasecheck.entity;

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
    name = "release_check_metadata",
    uniqueConstraints = @UniqueConstraint(name = "uk_release_check_metadata_card", columnNames = "card_id")
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReleaseCheckMetadata extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "card_id", nullable = false, unique = true)
  @OnDelete(action = OnDeleteAction.CASCADE)
  private Card card;

  @Enumerated(EnumType.STRING)
  @Column(name = "release_status", nullable = false, length = 30)
  private ReleaseStatus releaseStatus = ReleaseStatus.PREPARING;

  @Enumerated(EnumType.STRING)
  @Column(name = "target_environment", nullable = false, length = 30)
  private ReleaseEnvironment targetEnvironment = ReleaseEnvironment.PRODUCTION;

  @Column(name = "version", length = 100)
  private String version;

  @Enumerated(EnumType.STRING)
  @Column(name = "smoke_test_status", nullable = false, length = 20)
  private SmokeTestStatus smokeTestStatus = SmokeTestStatus.PENDING;

  @Lob
  @Column(name = "release_notes")
  private String releaseNotes;

  @Lob
  @Column(name = "rollback_plan")
  private String rollbackPlan;

  public ReleaseCheckMetadata(Card card) {
    this.card = card;
  }

  public void updateReleaseStatus(ReleaseStatus releaseStatus) {
    this.releaseStatus = releaseStatus;
  }

  public void updateTargetEnvironment(ReleaseEnvironment targetEnvironment) {
    this.targetEnvironment = targetEnvironment;
  }

  public void updateVersion(String version) {
    this.version = version;
  }

  public void updateSmokeTestStatus(SmokeTestStatus smokeTestStatus) {
    this.smokeTestStatus = smokeTestStatus;
  }

  public void updateReleaseNotes(String releaseNotes) {
    this.releaseNotes = releaseNotes;
  }

  public void updateRollbackPlan(String rollbackPlan) {
    this.rollbackPlan = rollbackPlan;
  }
}
