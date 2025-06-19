package com.example.security;

import io.micronaut.security.token.generator.TokenGenerator;
import io.micronaut.security.token.jwt.generator.JwtTokenGenerator;
import io.micronaut.security.token.jwt.validator.JwtTokenValidator;
import io.micronaut.security.token.Claims;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.core.annotation.Nullable;
import jakarta.inject.Singleton;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Singleton
public class JwtTokenService {
    
    private final TokenGenerator tokenGenerator;
    private final JwtTokenValidator tokenValidator;
    
    @Inject
    public JwtTokenService(TokenGenerator tokenGenerator, JwtTokenValidator tokenValidator) {
        this.tokenGenerator = tokenGenerator;
        this.tokenValidator = tokenValidator;
    }
    
    /**
     * Generate JWT access token for authenticated user
     */
    public Optional<String> generateAccessToken(Authentication authentication) {
        return tokenGenerator.generateToken(authentication);
    }
    
    /**
     * Generate JWT refresh token with longer expiration
     */
    public Optional<String> generateRefreshToken(String username, Collection<String> roles) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", username);
        claims.put("roles", roles);
        claims.put("token_type", "refresh");
        claims.put("iat", Instant.now().getEpochSecond());
        claims.put("exp", Instant.now().plus(7, ChronoUnit.DAYS).getEpochSecond());
        
        return tokenGenerator.generateToken(claims);
    }
    
    /**
     * Validate JWT token and extract claims
     */
    public Optional<Claims> validateToken(String token) {
        try {
            return tokenValidator.validateToken(token, null);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
    
    /**
     * Extract username from token
     */
    public Optional<String> extractUsername(String token) {
        return validateToken(token)
                .map(claims -> claims.getSubject());
    }
    
    /**
     * Extract roles from token
     */
    @SuppressWarnings("unchecked")
    public Collection<String> extractRoles(String token) {
        return validateToken(token)
                .map(claims -> {
                    Object rolesObj = claims.get("roles");
                    if (rolesObj instanceof Collection) {
                        return (Collection<String>) rolesObj;
                    }
                    return Collections.<String>emptyList();
                })
                .orElse(Collections.emptyList());
    }
    
    /**
     * Check if token is expired
     */
    public boolean isTokenExpired(String token) {
        return validateToken(token)
                .map(claims -> {
                    Long exp = claims.getExpiration();
                    return exp != null && Instant.ofEpochSecond(exp).isBefore(Instant.now());
                })
                .orElse(true);
    }
    
    /**
     * Check if token is a refresh token
     */
    public boolean isRefreshToken(String token) {
        return validateToken(token)
                .map(claims -> "refresh".equals(claims.get("token_type")))
                .orElse(false);
    }
    
    /**
     * Refresh access token using refresh token
     */
    public Optional<String> refreshAccessToken(String refreshToken) {
        if (!isRefreshToken(refreshToken) || isTokenExpired(refreshToken)) {
            return Optional.empty();
        }
        
        Optional<String> username = extractUsername(refreshToken);
        Collection<String> roles = extractRoles(refreshToken);
        
        if (username.isPresent()) {
            Map<String, Object> claims = new HashMap<>();
            claims.put("sub", username.get());
            claims.put("roles", roles);
            claims.put("iat", Instant.now().getEpochSecond());
            claims.put("exp", Instant.now().plus(1, ChronoUnit.HOURS).getEpochSecond());
            
            return tokenGenerator.generateToken(claims);
        }
        
        return Optional.empty();
    }
}