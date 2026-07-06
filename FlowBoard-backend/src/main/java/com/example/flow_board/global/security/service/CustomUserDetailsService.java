package com.example.flow_board.global.security.service;

import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.user.repository.UserRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

  private final UserRepository userRepository;

  @Override
  public UserDetails loadUserByUsername(String email) {
    User user = userRepository.findByEmail(email)
        .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED));

    return new CustomUserDetails(user);
  }
}