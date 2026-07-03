package com.example.backend_template.global.security.service;

import com.example.backend_template.domain.user.entity.User;
import com.example.backend_template.domain.user.repository.UserRepository;
import com.example.backend_template.global.exception.CustomException;
import com.example.backend_template.global.exception.ErrorCode;
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