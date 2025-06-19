package com.api.dto;

import io.micronaut.core.annotation.Introspected;
import io.micronaut.serde.annotation.Serdeable;

import java.time.LocalDateTime;

/**
 * DTO for authentication response data.
 * 
 * This class represents the response structure returned after
 * successful authentication, including the JWT token and user information.
 * 
 * @author Implementation Developer
 */
@Introspected
@Serdeable
public class AuthResponse {

    private String accessToken;
    private String tokenType = "Bearer";
    private Long expiresIn;
    private UserResponse user;
    private LocalDateTime issuedAt;
    private LocalDateTime expiresAt;

    // Default constructor
    public AuthResponse() {
        this.issuedAt = LocalDateTime.now();
    }

    // Constructor with token and user
    public AuthResponse(String accessToken, Long expiresIn, UserResponse user) {
        this();
        this.accessToken = accessToken;
        this.expiresIn = expiresIn;
        this.user = user;
        this.expiresAt = this.issuedAt.plusSeconds(expiresIn);
    }

    // Static factory method
    public static AuthResponse of(String accessToken, Long expiresIn, UserResponse user) {
        return new AuthResponse(accessToken, expiresIn, user);
    }

    // Getters and Setters
    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public Long getExpiresIn() {
        return expiresIn;
    }

    public void setExpiresIn(Long expiresIn) {
        this.expiresIn = expiresIn;
        if (this.issuedAt != null) {
            this.expiresAt = this.issuedAt.plusSeconds(expiresIn);
        }
    }

    public UserResponse getUser() {
        return user;
    }

    public void setUser(UserResponse user) {
        this.user = user;
    }

    public LocalDateTime getIssuedAt() {
        return issuedAt;
    }

    public void setIssuedAt(LocalDateTime issuedAt) {
        this.issuedAt = issuedAt;
        if (this.expiresIn != null) {
            this.expiresAt = issuedAt.plusSeconds(this.expiresIn);
        }
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(LocalDateTime expiresAt) {
        this.expiresAt = expiresAt;
    }

    // Utility methods
    public boolean isExpired() {
        return expiresAt != null && LocalDateTime.now().isAfter(expiresAt);
    }

    public long getTimeToExpiration() {
        if (expiresAt == null) {
            return 0;
        }
        LocalDateTime now = LocalDateTime.now();
        return now.isBefore(expiresAt) ? 
            java.time.Duration.between(now, expiresAt).getSeconds() : 0;
    }

    @Override
    public String toString() {
        return "AuthResponse{" +
                "tokenType='" + tokenType + '\'' +
                ", expiresIn=" + expiresIn +
                ", user=" + user +
                ", issuedAt=" + issuedAt +
                ", expiresAt=" + expiresAt +
                '}';
    }
}
