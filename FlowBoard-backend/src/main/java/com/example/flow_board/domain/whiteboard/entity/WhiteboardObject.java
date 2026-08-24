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
            columnNames = {
                "whiteboard_id",
                "client_object_id"
            }
        )
    },
    indexes = {
        @Index(
            name = "idx_whiteboard_objects_whiteboard_z",
            columnList = "whiteboard_id, z_index, id"
        ),
        @Index(
            name = "idx_whiteboard_objects_creator",
            columnList = "created_by"
        )
    }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WhiteboardObject
    extends BaseEntity {

  @Id
  @GeneratedValue(
      strategy = GenerationType.IDENTITY
  )
  private Long id;

  /**
   * 객체가 속한 화이트보드.
   *
   * 같은 Board 안에 여러 Whiteboard가 있어도
   * 객체는 해당 Whiteboard에만 표시됩니다.
   */
  @ManyToOne(
      fetch = FetchType.LAZY,
      optional = false
  )
  @JoinColumn(
      name = "whiteboard_id",
      nullable = false
  )
  private Whiteboard whiteboard;

  /**
   * 객체를 최초 생성한 사용자.
   */
  @ManyToOne(
      fetch = FetchType.LAZY,
      optional = false
  )
  @JoinColumn(
      name = "created_by",
      nullable = false
  )
  private User createdBy;

  /**
   * 브라우저에서 먼저 생성하는 UUID.
   *
   * WebSocket 재전송이나 네트워크 재시도로
   * 같은 객체가 중복 생성되는 것을 방지합니다.
   */
  @Column(
      name = "client_object_id",
      nullable = false,
      length = 36
  )
  private String clientObjectId;

  /**
   * STICKY_NOTE / TEXT / RECTANGLE /
   * ELLIPSE / ARROW
   */
  @Enumerated(EnumType.STRING)
  @Column(
      name = "object_type",
      nullable = false,
      length = 30
  )
  private WhiteboardObjectType type;

  /**
   * 캔버스 좌표.
   *
   * 현재 논리 Canvas 기준 좌표를 저장하고,
   * Zoom/Pan은 프론트 표시 계층에서 처리합니다.
   */
  @Column(
      nullable = false
  )
  private Double x;

  @Column(
      nullable = false
  )
  private Double y;

  /**
   * 객체 크기.
   *
   * 스티키 / 텍스트 / 도형의 리사이즈에 사용합니다.
   */
  @Column(
      nullable = false
  )
  private Double width;

  @Column(
      nullable = false
  )
  private Double height;

  /**
   * 객체 회전 각도.
   *
   * 현재 0도로 시작하고,
   * 추후 회전 기능을 추가할 수 있도록 미리 저장합니다.
   */
  @Column(
      nullable = false
  )
  private Double rotation;

  /**
   * 스티키 노트나 텍스트의 내용.
   *
   * 도형에서는 null일 수 있습니다.
   */
  @Lob
  @Column(
      columnDefinition = "TEXT"
  )
  private String content;

  /**
   * 객체 배경색.
   *
   * 예:
   * 스티키 노트 노란색,
   * 사각형 내부 배경색.
   */
  @Column(
      name = "fill_color",
      length = 30
  )
  private String fillColor;

  /**
   * 테두리 / 선 색상.
   */
  @Column(
      name = "stroke_color",
      length = 30
  )
  private String strokeColor;

  /**
   * 테두리 / 화살표 선 굵기.
   */
  @Column(
      name = "stroke_width"
  )
  private Integer strokeWidth;

  /**
   * 스티키 / 텍스트 글자 크기.
   */
  @Column(
      name = "font_size"
  )
  private Integer fontSize;

  /**
   * 객체 표시 순서.
   *
   * 값이 큰 객체가 앞쪽에 표시됩니다.
   */
  @Column(
      name = "z_index",
      nullable = false
  )
  private Integer zIndex;

  /**
   * 특정 객체 유형에서만 필요한 추가 속성.
   *
   * 예:
   * - ARROW의 화살촉 설정
   * - 이후 Connector 연결 대상
   * - 이후 Image 메타데이터
   *
   * 공통 테이블에 매번 컬럼을 추가하지 않고
   * 확장하기 위한 JSON 공간입니다.
   */
  @Lob
  @Column(
      name = "properties_json",
      columnDefinition = "LONGTEXT"
  )
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
    this.propertiesJson = propertiesJson;
  }

  /**
   * 객체의 현재 상태 전체를 갱신합니다.
   *
   * 이동 / 크기 변경 / 텍스트 수정 /
   * 색상 수정 등을 하나의 Update API로
   * 처리하기 위한 메서드입니다.
   */
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

  /**
   * 앞으로 / 뒤로 보내기처럼
   * 레이어 순서만 바꿀 때 사용합니다.
   */
  public void updateZIndex(
      Integer zIndex
  ) {
    this.zIndex = zIndex;
  }
}