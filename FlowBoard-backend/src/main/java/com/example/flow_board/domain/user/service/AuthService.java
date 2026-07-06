package com.example.flow_board.domain.user.service;

import com.example.flow_board.domain.user.dto.request.LoginRequest;
import com.example.flow_board.domain.user.dto.request.LogoutRequest;
import com.example.flow_board.domain.user.dto.request.SignupRequest;
import com.example.flow_board.domain.user.dto.request.TokenRefreshRequest;
import com.example.flow_board.domain.user.dto.response.TokenResponse;
import com.example.flow_board.domain.user.entity.RefreshToken;
import com.example.flow_board.domain.user.entity.User;
import com.example.flow_board.domain.user.repository.RefreshTokenRepository;
import com.example.flow_board.domain.user.repository.UserRepository;
import com.example.flow_board.global.exception.CustomException;
import com.example.flow_board.global.exception.ErrorCode;
import com.example.flow_board.global.security.jwt.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

  private final UserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final JwtProvider jwtProvider;
  private final RefreshTokenRepository refreshTokenRepository;

  @Transactional
  public void signup(SignupRequest request) {
    if (userRepository.existsByEmail(request.email())) {
      throw new CustomException(ErrorCode.EMAIL_ALREADY_EXISTS);
    }

    String encodedPassword = passwordEncoder.encode(request.password());

    User user = new User(
        request.email(),
        encodedPassword,
        request.nickname()
    );

    userRepository.save(user);
  }

  @Transactional
  public TokenResponse login(LoginRequest request) {
    User user = userRepository.findByEmail(request.email())
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    if (!passwordEncoder.matches(request.password(), user.getPassword())) {
      throw new CustomException(ErrorCode.PASSWORD_NOT_MATCH);
    }

    String accessToken = jwtProvider.createAccessToken(user.getId(), user.getEmail());
    String refreshToken = jwtProvider.createRefreshToken(user.getId());

    refreshTokenRepository.findByUser(user)
        .ifPresentOrElse(
            savedToken -> savedToken.updateToken(refreshToken),
            () -> refreshTokenRepository.save(new RefreshToken(user, refreshToken))
        );

    return new TokenResponse(accessToken, refreshToken);
  }

  @Transactional
  public void logout(LogoutRequest request) {
    RefreshToken refreshToken = refreshTokenRepository.findByToken(request.refreshToken())
        .orElseThrow(() -> new CustomException(ErrorCode.INVALID_TOKEN));

    refreshTokenRepository.delete(refreshToken);
  }

  @Transactional
  public TokenResponse reissue(TokenRefreshRequest request) {
    String refreshToken = request.refreshToken();

    jwtProvider.validateToken(refreshToken);

    RefreshToken savedRefreshToken = refreshTokenRepository.findByToken(refreshToken)
        .orElseThrow(() -> new CustomException(ErrorCode.INVALID_TOKEN));

    User user = savedRefreshToken.getUser();

    String newAccessToken = jwtProvider.createAccessToken(user.getId(), user.getEmail());
    String newRefreshToken = jwtProvider.createRefreshToken(user.getId());

    savedRefreshToken.updateToken(newRefreshToken);

    return new TokenResponse(newAccessToken, newRefreshToken);
  }
}