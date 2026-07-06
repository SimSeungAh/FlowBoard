package com.example.flow_board.domain.user.dto.response;

import com.example.flow_board.domain.user.entity.User;

public record UserResponse(
    Long id,
    String email,
    String nickname
) {
  public static UserResponse from(User user) {
    return new UserResponse(
        user.getId(),
        user.getEmail(),
        user.getNickname()
    );
  }
}