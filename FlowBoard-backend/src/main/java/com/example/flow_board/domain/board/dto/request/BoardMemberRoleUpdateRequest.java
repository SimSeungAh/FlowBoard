package com.example.flow_board.domain.board.dto.request;

import com.example.flow_board.domain.board.entity.BoardRole;
import jakarta.validation.constraints.NotNull;

public record BoardMemberRoleUpdateRequest(
    @NotNull(message = "변경할 보드 역할은 필수입니다.")
    BoardRole role
) {
}
