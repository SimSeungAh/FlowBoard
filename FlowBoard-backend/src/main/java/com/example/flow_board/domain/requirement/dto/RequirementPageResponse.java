package com.example.flow_board.domain.requirement.dto;

import java.util.List;

public record RequirementPageResponse(
    List<RequirementResponse> content,
    int number,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last
) {
}
