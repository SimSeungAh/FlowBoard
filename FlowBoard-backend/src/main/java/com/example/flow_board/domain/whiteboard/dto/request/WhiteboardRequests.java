package com.example.flow_board.domain.whiteboard.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class WhiteboardRequests {

  private WhiteboardRequests() {
  }

  /**
   * 화이트보드 생성
   */
  public record Create(

      @NotBlank(
          message = "화이트보드 이름은 필수입니다."
      )
      @Size(
          max = 100,
          message = "화이트보드 이름은 100자 이하로 입력해주세요."
      )
      String title,

      @Size(
          max = 500,
          message = "화이트보드 설명은 500자 이하로 입력해주세요."
      )
      String description

  ) {
  }

  /**
   * 화이트보드 이름 / 설명 변경
   */
  public record Update(

      @NotBlank(
          message = "화이트보드 이름은 필수입니다."
      )
      @Size(
          max = 100,
          message = "화이트보드 이름은 100자 이하로 입력해주세요."
      )
      String title,

      @Size(
          max = 500,
          message = "화이트보드 설명은 500자 이하로 입력해주세요."
      )
      String description

  ) {
  }

  /**
   * 화이트보드 배경 설정
   */
  public record Appearance(

      @NotBlank(
          message = "배경 색상은 필수입니다."
      )
      @Size(
          max = 30,
          message = "배경 색상 값은 30자 이하로 입력해주세요."
      )
      String backgroundColor,

      @NotNull(
          message = "그리드 사용 여부는 필수입니다."
      )
      Boolean gridEnabled

  ) {
  }

  /**
   * 화이트보드 순서 변경
   */
  public record Reorder(

      @NotEmpty(
          message = "화이트보드 순서는 비어 있을 수 없습니다."
      )
      List<
          @NotNull(
              message = "화이트보드 ID는 필수입니다."
          )
              Long
          > whiteboardIds

  ) {
  }
}