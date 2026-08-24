package com.example.flow_board.domain.whiteboard.dto.request;

import com.example.flow_board.domain.whiteboard.entity.WhiteboardObjectType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

public final class WhiteboardObjectRequests {

  private WhiteboardObjectRequests() {
  }

  /**
   * 객체 생성 요청.
   *
   * 위치/크기/스타일까지 초기 상태를
   * 한 번에 서버에 저장합니다.
   */
  public record Create(

      @NotBlank(
          message = "클라이언트 객체 ID는 필수입니다."
      )
      @Size(
          max = 36,
          message = "클라이언트 객체 ID는 36자 이하로 입력해주세요."
      )
      String clientObjectId,

      @NotNull(
          message = "화이트보드 객체 유형은 필수입니다."
      )
      WhiteboardObjectType type,

      @NotNull(
          message = "X 좌표는 필수입니다."
      )
      Double x,

      @NotNull(
          message = "Y 좌표는 필수입니다."
      )
      Double y,

      @NotNull(
          message = "객체 너비는 필수입니다."
      )
      @Positive(
          message = "객체 너비는 0보다 커야 합니다."
      )
      Double width,

      @NotNull(
          message = "객체 높이는 필수입니다."
      )
      @Positive(
          message = "객체 높이는 0보다 커야 합니다."
      )
      Double height,

      @NotNull(
          message = "회전 값은 필수입니다."
      )
      Double rotation,

      @Size(
          max = 10000,
          message = "객체 내용은 10000자 이하로 입력해주세요."
      )
      String content,

      @Size(
          max = 30,
          message = "배경 색상 값은 30자 이하로 입력해주세요."
      )
      String fillColor,

      @Size(
          max = 30,
          message = "선 색상 값은 30자 이하로 입력해주세요."
      )
      String strokeColor,

      @Positive(
          message = "선 굵기는 0보다 커야 합니다."
      )
      @Max(
          value = 50,
          message = "선 굵기는 50 이하로 입력해주세요."
      )
      Integer strokeWidth,

      @Positive(
          message = "글자 크기는 0보다 커야 합니다."
      )
      @Max(
          value = 200,
          message = "글자 크기는 200 이하로 입력해주세요."
      )
      Integer fontSize,

      @PositiveOrZero(
          message = "zIndex는 0 이상이어야 합니다."
      )
      Integer zIndex,

      String propertiesJson

  ) {
  }

  /**
   * 객체 수정 요청.
   *
   * 선택 도구에서 이동 / 리사이즈 /
   * 텍스트 편집 / 색상 변경 등이 발생하면
   * 현재 객체 상태 전체를 전달합니다.
   */
  public record Update(

      @NotNull(
          message = "X 좌표는 필수입니다."
      )
      Double x,

      @NotNull(
          message = "Y 좌표는 필수입니다."
      )
      Double y,

      @NotNull(
          message = "객체 너비는 필수입니다."
      )
      @Positive(
          message = "객체 너비는 0보다 커야 합니다."
      )
      Double width,

      @NotNull(
          message = "객체 높이는 필수입니다."
      )
      @Positive(
          message = "객체 높이는 0보다 커야 합니다."
      )
      Double height,

      @NotNull(
          message = "회전 값은 필수입니다."
      )
      Double rotation,

      @Size(
          max = 10000,
          message = "객체 내용은 10000자 이하로 입력해주세요."
      )
      String content,

      @Size(
          max = 30,
          message = "배경 색상 값은 30자 이하로 입력해주세요."
      )
      String fillColor,

      @Size(
          max = 30,
          message = "선 색상 값은 30자 이하로 입력해주세요."
      )
      String strokeColor,

      @Positive(
          message = "선 굵기는 0보다 커야 합니다."
      )
      @Max(
          value = 50,
          message = "선 굵기는 50 이하로 입력해주세요."
      )
      Integer strokeWidth,

      @Positive(
          message = "글자 크기는 0보다 커야 합니다."
      )
      @Max(
          value = 200,
          message = "글자 크기는 200 이하로 입력해주세요."
      )
      Integer fontSize,

      @PositiveOrZero(
          message = "zIndex는 0 이상이어야 합니다."
      )
      Integer zIndex,

      String propertiesJson

  ) {
  }

  /**
   * 객체 레이어 순서만 변경할 때 사용합니다.
   */
  public record Layer(

      @NotNull(
          message = "zIndex는 필수입니다."
      )
      @Min(
          value = 0,
          message = "zIndex는 0 이상이어야 합니다."
      )
      Integer zIndex

  ) {
  }
}