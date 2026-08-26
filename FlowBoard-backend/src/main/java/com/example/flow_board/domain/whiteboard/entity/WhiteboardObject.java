package com.example.flow_board.domain.whiteboard.entity;

import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.global.entity.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
    name = "whiteboard_objects",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_whiteboard_object_client_id",
            columnNames = {"whiteboard_id", "client_object_id"}
        )
    },
    indexes = {
        @Index(name = "idx_whiteboard_objects_whiteboard_z", columnList = "whiteboard_id, z_index, id"),
        @Index(name = "idx_whiteboard_objects_creator", columnList = "created_by")
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WhiteboardObject extends BaseEntity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "whiteboard_id", nullable = false)
  private Whiteboard whiteboard;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "created_by", nullable = false)
  private User createdBy;

  @Column(name = "client_object_id", nullable = false, length = 36)
  private String clientObjectId;

  @Enumerated(EnumType.STRING)
  @Column(name = "object_type", nullable = false, length = 30)
  private WhiteboardObjectType type;

  @Column(nullable = false)
  private Double x;

  @Column(nullable = false)
  private Double y;

  @Column(nullable = false)
  private Double width;

  @Column(nullable = false)
  private Double height;

  @Column(nullable = false)
  private Double rotation;

  @Lob
  @Column(columnDefinition = "TEXT")
  private String content;

  @Column(name = "fill_color", length = 30)
  private String fillColor;

  @Column(name = "stroke_color", length = 30)
  private String strokeColor;

  @Column(name = "stroke_width")
  private Integer strokeWidth;

  @Column(name = "font_size")
  private Integer fontSize;

  @Column(name = "z_index", nullable = false)
  private Integer zIndex;

  @Column(name = "layer_name", length = 120)
  private String layerName;

  @Column(name = "is_visible", nullable = false, columnDefinition = "boolean default true")
  private boolean visible = true;

  @Column(name = "is_locked", nullable = false, columnDefinition = "boolean default false")
  private boolean locked = false;

  @Lob
  @Column(name = "properties_json", columnDefinition = "LONGTEXT")
  private String propertiesJson;

  public WhiteboardObject(
      Whiteboard whiteboard,
      User createdBy,
      String clientObjectId,
      WhiteboardObjectType type,
      Double x,
      Double y,
      Double width,
      Double height,
      Double rotation,
      String content,
      String fillColor,
      String strokeColor,
      Integer strokeWidth,
      Integer fontSize,
      Integer zIndex,
      String propertiesJson
  ) {
    this.whiteboard = whiteboard;
    this.createdBy = createdBy;
    this.clientObjectId = clientObjectId;
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rotation = rotation;
    this.content = content;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
    this.strokeWidth = strokeWidth;
    this.fontSize = fontSize;
    this.zIndex = zIndex;
    this.layerName = null;
    this.visible = true;
    this.locked = false;
    this.propertiesJson = propertiesJson;
  }

  public void update(
      Double x,
      Double y,
      Double width,
      Double height,
      Double rotation,
      String content,
      String fillColor,
      String strokeColor,
      Integer strokeWidth,
      Integer fontSize,
      Integer zIndex,
      String propertiesJson
  ) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.rotation = rotation;
    this.content = content;
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
    this.strokeWidth = strokeWidth;
    this.fontSize = fontSize;
    this.zIndex = zIndex;
    this.propertiesJson = propertiesJson;
  }

  public void updateZIndex(Integer zIndex) {
    this.zIndex = zIndex;
  }

  public void updateLayerMetadata(String layerName, boolean visible) {
    this.layerName = layerName;
    this.visible = visible;
  }

  public void updateLocked(boolean locked) {
    this.locked = locked;
  }
}
