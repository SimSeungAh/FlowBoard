package com.example.flow_board.domain.user.dto.response;

public record TokenResponse(
    String accessToken,
    String refreshToken
) {
}