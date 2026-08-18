package com.example.flow_board.domain.board.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * 보드 컬럼 커스터마이징 요청 DTO 모음입니다.
 */
public final class BoardColumnRequests {

    private BoardColumnRequests() {
    }

    /**
     * 컬럼 생성
     */
    public record Create(

            @NotBlank(
                    message = "컬럼 이름은 필수입니다."
            )
            @Size(
                    max = 50,
                    message = "컬럼 이름은 50자 이하로 입력해주세요."
            )
            String title

    ) {
    }

    /**
     * 컬럼 이름 변경
     */
    public record Update(

            @NotBlank(
                    message = "컬럼 이름은 필수입니다."
            )
            @Size(
                    max = 50,
                    message = "컬럼 이름은 50자 이하로 입력해주세요."
            )
            String title

    ) {
    }

    /**
     * 컬럼 순서 변경
     * <p>
     * 현재 보드의 모든 컬럼 ID를
     * 원하는 순서대로 전달합니다.
     */
    public record Reorder(

            @NotEmpty(
                    message = "컬럼 순서는 비어 있을 수 없습니다."
            )
            List<
                    @NotNull(
                            message = "컬럼 ID는 필수입니다."
                    )
                            Long
                    > columnIds

    ) {
    }
}