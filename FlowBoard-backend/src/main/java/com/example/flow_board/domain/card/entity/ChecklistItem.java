package com.example.flow_board.domain.card.entity;

import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "checklist_items")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChecklistItem extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "checklist_id", nullable = false)
  private Checklist checklist;

  @Column(nullable = false, length = 255)
  private String content;

  @Column(name = "is_checked", nullable = false)
  private boolean checked;

  @Column(nullable = false)
  private Integer position;

  public ChecklistItem(Checklist checklist, String content, Integer position) {
    this.checklist = checklist;
    this.content = content;
    this.position = position;
    this.checked = false;
  }

  public void updateContent(String content) {
    this.content = content;
  }

  public void toggleChecked() {
    this.checked = !this.checked;
  }

  public void updatePosition(Integer position) {
    this.position = position;
  }
}