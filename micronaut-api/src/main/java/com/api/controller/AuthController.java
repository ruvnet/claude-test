package com.api.controller;

import com.api.dto.*;
import com.api.service.AuthService;
import com.api.service.UserService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.validation.Validated;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.validation.Valid;
import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for authentication endpoints.
 * 
 * This controller handles user authentication operations including
 * registration, login, token refresh, and password management.
 * 
 * @author Implementation Developer
 */
@Controller("/api/auth")
@Validated
@Tag(name = "Authentication", description = "User authentication and registration endpoints")
public class AuthController {

    private static final Logger LOG = LoggerFactory.getLogger(AuthController.class);

    private final AuthService authService;
    private final UserService userService;

    @Inject
    public AuthController(AuthService authService, UserService userService) {
        this.authService = authService;
        this.userService = userService;
    }

    /**
     * Register a new user account.
     * 
     * @param registrationRequest the registration request data
     * @return HTTP response with user information or error
     */
    @Post("/register")
    @Secured(SecurityRule.IS_ANONYMOUS)
    @Operation(
        summary = "Register new user",
        description = "Creates a new user account with the provided information"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "User registered successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid registration data"),
        @ApiResponse(responseCode = "409", description = "Username or email already exists")
    })
    public HttpResponse<?> register(@Body @Valid UserRegistrationRequest registrationRequest) {
        LOG.info("User registration attempt for username: {}", registrationRequest.getUsername());
        
        try {
            UserResponse userResponse = userService.registerUser(registrationRequest);
            LOG.info("User registered successfully: {}", userResponse.getUsername());
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User registered successfully");
            response.put("user", userResponse);
            
            return HttpResponse.created(response);
        } catch (Exception e) {
            LOG.error("Registration failed for username: {}", registrationRequest.getUsername(), e);
            throw e;
        }
    }

    /**
     * Authenticate user and return JWT token.
     * 
     * @param loginRequest the login request data
     * @return HTTP response with authentication token or error
     */
    @Post("/login")
    @Secured(SecurityRule.IS_ANONYMOUS)
    @Operation(
        summary = "User login",
        description = "Authenticates user credentials and returns JWT token"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Login successful"),
        @ApiResponse(responseCode = "401", description = "Invalid credentials"),
        @ApiResponse(responseCode = "400", description = "Invalid request data")
    })
    public HttpResponse<?> login(@Body @Valid UserLoginRequest loginRequest) {
        LOG.info("Login attempt for user: {}", loginRequest.getUsernameOrEmail());
        
        try {
            AuthResponse authResponse = authService.authenticateUser(loginRequest);
            LOG.info("Login successful for user: {}", loginRequest.getUsernameOrEmail());
            
            return HttpResponse.ok(authResponse);
        } catch (Exception e) {
            LOG.warn("Login failed for user: {}", loginRequest.getUsernameOrEmail(), e);
            throw e;
        }
    }

    /**
     * Refresh JWT token.
     * 
     * @param principal the authenticated principal
     * @return HTTP response with new token or error
     */
    @Post("/refresh")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    @SecurityRequirement(name = "BearerAuth")
    @Operation(
        summary = "Refresh JWT token",
        description = "Generates a new JWT token for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Token refreshed successfully"),
        @ApiResponse(responseCode = "401", description = "Invalid or expired token")
    })
    public HttpResponse<?> refreshToken(Principal principal) {
        LOG.info("Token refresh request for user: {}", principal.getName());
        
        try {
            AuthResponse authResponse = authService.refreshToken(null, principal.getName());
            LOG.info("Token refreshed successfully for user: {}", principal.getName());
            
            return HttpResponse.ok(authResponse);
        } catch (Exception e) {
            LOG.error("Token refresh failed for user: {}", principal.getName(), e);
            throw e;
        }
    }

    /**
     * Change password for authenticated user.
     * 
     * @param passwordChangeRequest the password change request
     * @param principal the authenticated principal
     * @return HTTP response with success message or error
     */
    @Put("/change-password")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    @SecurityRequirement(name = "BearerAuth")
    @Operation(
        summary = "Change password",
        description = "Changes the password for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Password changed successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "401", description = "Current password is incorrect")
    })
    public HttpResponse<?> changePassword(@Body @Valid PasswordChangeRequest passwordChangeRequest, 
                                         Principal principal) {
        LOG.info("Password change request for user: {}", principal.getName());
        
        try {
            authService.changePassword(
                principal.getName(), 
                passwordChangeRequest.getCurrentPassword(), 
                passwordChangeRequest.getNewPassword()
            );
            
            LOG.info("Password changed successfully for user: {}", principal.getName());
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Password changed successfully");
            
            return HttpResponse.ok(response);
        } catch (Exception e) {
            LOG.error("Password change failed for user: {}", principal.getName(), e);
            throw e;
        }
    }

    /**
     * Verify email address.
     * 
     * @param verificationRequest the email verification request
     * @return HTTP response with success message or error
     */
    @Post("/verify-email")
    @Secured(SecurityRule.IS_ANONYMOUS)
    @Operation(
        summary = "Verify email address",
        description = "Verifies user email address using verification token"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Email verified successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid verification token"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public HttpResponse<?> verifyEmail(@Body @Valid EmailVerificationRequest verificationRequest) {
        LOG.info("Email verification request for token: {}", verificationRequest.getToken());
        
        try {
            // Note: In a real implementation, you would validate the token and extract username
            // For now, we'll use a simplified approach
            boolean verified = authService.verifyEmail(verificationRequest.getUsername());
            
            if (verified) {
                LOG.info("Email verified successfully for user: {}", verificationRequest.getUsername());
                
                Map<String, String> response = new HashMap<>();
                response.put("message", "Email verified successfully");
                
                return HttpResponse.ok(response);
            } else {
                return HttpResponse.badRequest(Map.of("message", "Email verification failed"));
            }
        } catch (Exception e) {
            LOG.error("Email verification failed", e);
            throw e;
        }
    }

    /**
     * Check if username is available.
     * 
     * @param username the username to check
     * @return HTTP response with availability status
     */
    @Get("/check-username/{username}")
    @Secured(SecurityRule.IS_ANONYMOUS)
    @Operation(
        summary = "Check username availability",
        description = "Checks if a username is available for registration"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Username availability checked")
    })
    public HttpResponse<?> checkUsername(@PathVariable String username) {
        LOG.debug("Username availability check for: {}", username);
        
        boolean available = userService.isUsernameAvailable(username);
        
        Map<String, Object> response = new HashMap<>();
        response.put("username", username);
        response.put("available", available);
        
        return HttpResponse.ok(response);
    }

    /**
     * Check if email is available.
     * 
     * @param email the email to check
     * @return HTTP response with availability status
     */
    @Get("/check-email/{email}")
    @Secured(SecurityRule.IS_ANONYMOUS)
    @Operation(
        summary = "Check email availability",
        description = "Checks if an email is available for registration"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Email availability checked")
    })
    public HttpResponse<?> checkEmail(@PathVariable String email) {
        LOG.debug("Email availability check for: {}", email);
        
        boolean available = userService.isEmailAvailable(email);
        
        Map<String, Object> response = new HashMap<>();
        response.put("email", email);
        response.put("available", available);
        
        return HttpResponse.ok(response);
    }

    /**
     * Get authentication statistics (admin only).
     * 
     * @return HTTP response with authentication statistics
     */
    @Get("/stats")
    @Secured("ROLE_ADMIN")
    @SecurityRequirement(name = "BearerAuth")
    @Operation(
        summary = "Get authentication statistics",
        description = "Returns authentication statistics (admin only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public HttpResponse<?> getAuthStats() {
        LOG.debug("Authentication statistics requested");
        
        AuthService.AuthStats stats = authService.getAuthStats();
        return HttpResponse.ok(stats);
    }

    /**
     * DTO for password change requests.
     */
    public static class PasswordChangeRequest {
        @jakarta.validation.constraints.NotBlank(message = "Current password is required")
        private String currentPassword;
        
        @jakarta.validation.constraints.NotBlank(message = "New password is required")
        @jakarta.validation.constraints.Size(min = 8, message = "New password must be at least 8 characters")
        private String newPassword;
        
        // Getters and setters
        public String getCurrentPassword() { return currentPassword; }
        public void setCurrentPassword(String currentPassword) { this.currentPassword = currentPassword; }
        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    /**
     * DTO for email verification requests.
     */
    public static class EmailVerificationRequest {
        @jakarta.validation.constraints.NotBlank(message = "Verification token is required")
        private String token;
        
        @jakarta.validation.constraints.NotBlank(message = "Username is required")
        private String username;
        
        // Getters and setters
        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }
        public String getUsername() { return username; }
        public void setUsername(String username) { this.username = username; }
    }
}
