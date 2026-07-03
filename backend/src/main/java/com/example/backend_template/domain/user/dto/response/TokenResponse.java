package com.example.backend_template.domain.user.dto.response;

public record TokenResponse(
    String accessToken,
    String refreshToken
) {
}