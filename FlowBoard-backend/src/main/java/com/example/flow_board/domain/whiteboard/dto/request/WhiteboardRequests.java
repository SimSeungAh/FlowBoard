package com.example.flow_board.domain.whiteboard.dto.request;

import com.example.flow_board.domain.whiteboard.entity.WhiteboardGridType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class WhiteboardRequests {

  private WhiteboardRequests() {
  }

  public record Create(
      @NotBlank(message = "화이트보드 이름은 필수입니다.")
      @Size(max = 100, message = "화이트보드 이름은 100자 이하로 입력해주세요.")
      String title,

      @Size(max = 500, message = "화이트보드 설명은 500자 이하로 입력해주세요.")
      String description
  ) {
  }

  public record Update(
      @NotBlank(message = "화이트보드 이름은 필수입니다.")
      @Size(max = 100, message = "화이트보드 이름은 100자 이하로 입력해주세요.")
      String title,

      @Size(max = 500, message = "화이트보드 설명은 500자 이하로 입력해주세요.")
      String description
  ) {
  }

  /**
   * 캔버스 표시 설정.
   *
   * gridEnabled는 이전 프론트 호환을 위해 남겨둔 선택 필드입니다.
   * 신규 프론트는 gridType / gridSize / gridOpacity를 사용합니다.
   */
  public record Appearance(
      @NotBlank(message = "배경 색상은 필수입니다.")
      @Size(max = 30, message = "배경 색상 값은 30자 이하로 입력해주세요.")
      String backgroundColor,

      Boolean gridEnabled,

      WhiteboardGridType gridType,

      @Min(value = 8, message = "그리드 간격은 8 이상이어야 합니다.")
      @Max(value = 96, message = "그리드 간격은 96 이하이어야 합니다.")
      Integer gridSize,

      @DecimalMin(value = "0.03", message = "그리드 농도는 0.03 이상이어야 합니다.")
      @DecimalMax(value = "0.50", message = "그리드 농도는 0.50 이하이어야 합니다.")
      Double gridOpacity
  ) {
  }


  public record CanvasSize(
      @NotNull(message = "캔버스 너비는 필수입니다.")
      @Min(value = 800, message = "캔버스 너비는 800 이상이어야 합니다.")
      @Max(value = 6000, message = "캔버스 너비는 6000 이하이어야 합니다.")
      Integer width,

      @NotNull(message = "캔버스 높이는 필수입니다.")
      @Min(value = 500, message = "캔버스 높이는 500 이상이어야 합니다.")
      @Max(value = 4000, message = "캔버스 높이는 4000 이하이어야 합니다.")
      Integer height
  ) {
  }

  public record Reorder(
      @NotEmpty(message = "화이트보드 순서는 비어 있을 수 없습니다.")
      List<@NotNull(message = "화이트보드 ID는 필수입니다.") Long> whiteboardIds
  ) {
  }
}
