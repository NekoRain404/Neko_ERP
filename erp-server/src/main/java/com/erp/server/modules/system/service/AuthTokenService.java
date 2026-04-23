package com.erp.server.modules.system.service;

import com.erp.server.modules.system.entity.SysUser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AuthTokenService {

    private final SecretKey secretKey;
    private final long expirationMillis;

    public AuthTokenService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration:86400000}") long expirationMillis
    ) {
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = expirationMillis;
    }

    public String createToken(SysUser user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(user.getId()))
                .claim("username", user.getUsername())
                .claim("realName", user.getRealName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(expirationMillis)))
                .signWith(secretKey)
                .compact();
    }

    public Long parseUserIdFromAuthorizationHeader(String authorizationHeader) {
        String token = extractBearerToken(authorizationHeader);
        try {
            String subject = Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload()
                    .getSubject();
            return Long.valueOf(subject);
        } catch (Exception ex) {
            throw new IllegalArgumentException("当前会话已失效，请重新登录");
        }
    }

    private String extractBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank()) {
            throw new IllegalArgumentException("当前会话已失效，请重新登录");
        }
        String prefix = "Bearer ";
        if (!authorizationHeader.regionMatches(true, 0, prefix, 0, prefix.length())) {
            throw new IllegalArgumentException("当前会话已失效，请重新登录");
        }
        String token = authorizationHeader.substring(prefix.length()).trim();
        if (token.isBlank()) {
            throw new IllegalArgumentException("当前会话已失效，请重新登录");
        }
        return token;
    }
}
