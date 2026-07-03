package com.example.backend_template.global.security.jwt;

import com.example.backend_template.global.config.JwtProperties;
import com.example.backend_template.global.exception.CustomException;
import com.example.backend_template.global.exception.ErrorCode;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
@RequiredArgsConstructor
public class JwtProvider {

  private final JwtProperties jwtProperties;

  private SecretKey secretKey;

  @PostConstruct
  public void init() {
    this.secretKey = Keys.hmacShaKeyFor(
        jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8)
    );
  }

  public String createAccessToken(Long userId, String email) {
    Date now = new Date();
    Date expiration = new Date(
        now.getTime() + jwtProperties.getAccessTokenExpiration()
    );

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("email", email)
        .issuedAt(now)
        .expiration(expiration)
        .signWith(secretKey)
        .compact();
  }

  public String createRefreshToken(Long userId) {
    Date now = new Date();
    Date expiration = new Date(
        now.getTime() + jwtProperties.getRefreshTokenExpiration()
    );

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .issuedAt(now)
        .expiration(expiration)
        .signWith(secretKey)
        .compact();
  }

  public Long getUserId(String token) {
    return Long.valueOf(getClaims(token).getSubject());
  }

  public String getEmail(String token) {
    return getClaims(token).get("email", String.class);
  }

  public void validateToken(String token) {
    try {
      getClaims(token);
    } catch (ExpiredJwtException e) {
      throw new CustomException(ErrorCode.EXPIRED_TOKEN);
    } catch (UnsupportedJwtException e) {
      throw new CustomException(ErrorCode.UNSUPPORTED_TOKEN);
    } catch (MalformedJwtException | SecurityException | IllegalArgumentException e) {
      throw new CustomException(ErrorCode.INVALID_TOKEN);
    }
  }

  private Claims getClaims(String token) {
    return Jwts.parser()
        .verifyWith(secretKey)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}