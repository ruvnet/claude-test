package com.example.controller;

import com.example.dto.AuthResponse;
import com.example.dto.LoginRequest;
import com.example.dto.RefreshTokenRequest;
import com.example.model.Role;
import com.example.model.User;
import com.example.security.JwtTokenService;
import com.example.service.UserService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import java.util.Collection;
import java.util.Optional;
import java.util.stream.Collectors;

@Controller("/api/auth")
@Secured(SecurityRule.IS_ANONYMOUS)
public class AuthController {
    
    private final JwtTokenService jwtTokenService;
    private final UserService userService;
    
    @Inject
    public AuthController(JwtTokenService jwtTokenService, UserService userService) {
        this.jwtTokenService = jwtTokenService;
        this.userService = userService;
    }
    
    /**
     * Login endpoint
     */
    @Post("/login")
    public HttpResponse<?> login(@Valid @Body LoginRequest loginRequest) {
        try {
            // Find user by username or email
            Optional<User> userOpt = userService.findByUsername(loginRequest.getIdentity());
            if (userOpt.isEmpty()) {
                userOpt = userService.findByEmail(loginRequest.getIdentity());
            }
            
            if (userOpt.isEmpty()) {
                return HttpResponse.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid credentials");
            }
            
            User user = userOpt.get();
            
            // Verify password
            if (!com.example.security.AuthenticationProviderUserPassword
                    .verifyPassword(loginRequest.getPassword(), user.getPassword())) {
                return HttpResponse.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid credentials");
            }
            
            // Check account status
            if (!user.isEnabled() || !user.isAccountNonLocked() || 
                !user.isAccountNonExpired() || !user.isCredentialsNonExpired()) {
                return HttpResponse.status(HttpStatus.UNAUTHORIZED)
                        .body("Account is disabled or locked");
            }
            
            // Create authentication object
            Collection<String> roles = user.getRoles().stream()
                    .map(Role::getAuthority)
                    .collect(Collectors.toList());
            
            // Create a simple authentication object
            Authentication authentication = Authentication.build(user.getUsername(), roles);
            
            // Generate tokens
            Optional<String> accessToken = jwtTokenService.generateAccessToken(authentication);
            Optional<String> refreshToken = jwtTokenService.generateRefreshToken(user.getUsername(), roles);
            
            if (accessToken.isPresent() && refreshToken.isPresent()) {
                // Update last login
                userService.updateLastLogin(user.getUsername());
                
                AuthResponse response = new AuthResponse(
                        accessToken.get(),
                        refreshToken.get(),
                        3600, // 1 hour
                        user.getUsername(),
                        roles
                );
                
                return HttpResponse.ok(response);
            } else {
                return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body("Failed to generate tokens");
            }
            
        } catch (Exception e) {
            return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Login failed: " + e.getMessage());
        }
    }
    
    /**
     * Refresh token endpoint
     */
    @Post("/refresh")
    public HttpResponse<?> refreshToken(@Valid @Body RefreshTokenRequest refreshRequest) {
        try {
            String refreshToken = refreshRequest.getRefreshToken();
            
            // Validate refresh token
            if (!jwtTokenService.isRefreshToken(refreshToken) || 
                jwtTokenService.isTokenExpired(refreshToken)) {
                return HttpResponse.status(HttpStatus.UNAUTHORIZED)
                        .body("Invalid or expired refresh token");
            }
            
            // Generate new access token
            Optional<String> newAccessToken = jwtTokenService.refreshAccessToken(refreshToken);
            
            if (newAccessToken.isPresent()) {
                // Extract user info from refresh token
                Optional<String> username = jwtTokenService.extractUsername(refreshToken);
                Collection<String> roles = jwtTokenService.extractRoles(refreshToken);
                
                AuthResponse response = new AuthResponse();
                response.setAccessToken(newAccessToken.get());
                response.setRefreshToken(refreshToken); // Keep the same refresh token
                response.setExpiresIn(3600); // 1 hour
                response.setUsername(username.orElse(""));
                response.setRoles(roles);
                
                return HttpResponse.ok(response);
            } else {
                return HttpResponse.status(HttpStatus.UNAUTHORIZED)
                        .body("Failed to refresh token");
            }
            
        } catch (Exception e) {
            return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Token refresh failed: " + e.getMessage());
        }
    }
    
    /**
     * Logout endpoint
     */
    @Post("/logout")
    @Get("/logout")
    public HttpResponse<?> logout() {
        // In a stateless JWT system, logout is typically handled client-side
        // by removing the token from storage. For server-side logout, you would
        // need to implement a token blacklist.
        return HttpResponse.ok("Logged out successfully");
    }
    
    /**
     * Get current user profile (protected endpoint for testing)
     */
    @Get("/profile")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> getProfile(Authentication authentication) {
        try {
            Optional<User> userOpt = userService.findByUsername(authentication.getName());
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                // Return user profile without password
                return HttpResponse.ok(new UserProfile(
                        user.getUsername(),
                        user.getEmail(),
                        user.getRoles().stream().map(Role::getAuthority).collect(Collectors.toList()),
                        user.getLastLogin()
                ));
            } else {
                return HttpResponse.status(HttpStatus.NOT_FOUND)
                        .body("User not found");
            }
            
        } catch (Exception e) {
            return HttpResponse.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Failed to get profile: " + e.getMessage());
        }
    }
    
    // Inner class for user profile response
    public static class UserProfile {
        private String username;
        private String email;
        private Collection<String> roles;
        private java.time.LocalDateTime lastLogin;
        
        public UserProfile(String username, String email, Collection<String> roles, java.time.LocalDateTime lastLogin) {
            this.username = username;
            this.email = email;
            this.roles = roles;
            this.lastLogin = lastLogin;
        }
        
        // Getters
        public String getUsername() { return username; }
        public String getEmail() { return email; }
        public Collection<String> getRoles() { return roles; }
        public java.time.LocalDateTime getLastLogin() { return lastLogin; }
    }
}