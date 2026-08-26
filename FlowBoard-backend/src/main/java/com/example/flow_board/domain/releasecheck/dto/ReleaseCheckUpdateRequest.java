package com.example.flow_board.domain.releasecheck.dto;

import com.example.flow_board.domain.releasecheck.entity.ReleaseEnvironment;
import com.example.flow_board.domain.releasecheck.entity.ReleaseStatus;
import com.example.flow_board.domain.releasecheck.entity.SmokeTestStatus;

public record ReleaseCheckUpdateRequest(
    ReleaseStatus releaseStatus,
    ReleaseEnvironment targetEnvironment,
    String version,
    SmokeTestStatus smokeTestStatus,
    String releaseNotes,
    String rollbackPlan
) {
}
