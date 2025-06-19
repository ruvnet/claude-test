package com.api.service;

import com.api.dto.AuthResponse;
import com.api.dto.UserLoginRequest;
import com.api.dto.UserResponse;
import com.api.exception.AuthenticationException;
import com.api.exception.UserNotFoundException;
import com.api.model.User;
import com.api.repository.UserRepository;
import io.micronaut.security.authentication.UsernamePasswordCredentials;
import io.micronaut.security.token.generator.TokenGenerator;
import jakarta.inject.Singleton;
import org.mindrot.jbcrypt.BCrypt;

import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service class for Authentication-related business logic.
 * 
 * This service handles user authentication, token generation,
 * and security-related operations.
 * 
 * @author Implementation Developer
 */
@Singleton
public class AuthService {

    private final UserRepository userRepository;
    private final UserService userService;
    private final TokenGenerator tokenGenerator;
    
    // Token expiration time in seconds (1 hour)
    private static final long TOKEN_EXPIRATION_SECONDS = 3600;

    public AuthService(UserRepository userRepository,
                      UserService userService,
                      TokenGenerator tokenGenerator) {
        this.userRepository = userRepository;
        this.userService = userService;
        this.tokenGenerator = tokenGenerator;
    }

    /**
     * Authenticate user with username/email and password.
     * 
     * @param loginRequest the login request containing credentials
     * @return AuthResponse containing JWT token and user information
     * @throws AuthenticationException if authentication fails
     */
    @Transactional
    public AuthResponse authenticateUser(UserLoginRequest loginRequest) {
        // Find user by username or email
        User user = findUserByUsernameOrEmail(loginRequest.getUsernameOrEmail());
        
        // Check if user is enabled
        if (!user.getEnabled()) {
            throw new AuthenticationException("Account is disabled");
        }
        
        // Verify password
        if (!BCrypt.checkpw(loginRequest.getPassword(), user.getPassword())) {
            throw new AuthenticationException("Invalid credentials");
        }
        
        // Update last login timestamp
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
        
        // Generate JWT token
        String token = generateJwtToken(user);
        
        // Create user response
        UserResponse userResponse = UserResponse.from(user);
        
        return AuthResponse.of(token, TOKEN_EXPIRATION_SECONDS, userResponse);
    }

    /**
     * Generate JWT token for authenticated user.
     * 
     * @param user the authenticated user
     * @return JWT token string
     */
    private String generateJwtToken(User user) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("sub", user.getUsername());
        claims.put("iat", System.currentTimeMillis() / 1000);
        claims.put("exp", (System.currentTimeMillis() / 1000) + TOKEN_EXPIRATION_SECONDS);
        claims.put("user_id", user.getId());
        claims.put("email", user.getEmail());
        claims.put("full_name", user.getFullName());
        claims.put("roles", user.getRoles().stream()
                .map(role -> role.getName())
                .collect(Collectors.toList()));
        claims.put("enabled", user.getEnabled());
        claims.put("email_verified", user.getEmailVerified());
        
        return tokenGenerator.generateToken(claims).orElseThrow(
                () -> new RuntimeException("Failed to generate JWT token")
        );
    }

    /**
     * Find user by username or email.
     * 
     * @param usernameOrEmail the username or email to search for
     * @return User entity
     * @throws UserNotFoundException if user is not found
     */
    private User findUserByUsernameOrEmail(String usernameOrEmail) {
        // Try to find by username first
        Optional<User> userByUsername = userRepository.findByUsername(usernameOrEmail);
        if (userByUsername.isPresent()) {
            return userByUsername.get();
        }
        
        // Try to find by email
        Optional<User> userByEmail = userRepository.findByEmail(usernameOrEmail);
        if (userByEmail.isPresent()) {
            return userByEmail.get();
        }
        
        throw new UserNotFoundException("User not found with username or email: " + usernameOrEmail);
    }

    /**
     * Validate user credentials without generating token.
     * 
     * @param username the username
     * @param password the password
     * @return true if credentials are valid, false otherwise
     */
    public boolean validateCredentials(String username, String password) {
        try {
            User user = userRepository.findByUsername(username).orElse(null);
            if (user == null || !user.getEnabled()) {
                return false;
            }
            return BCrypt.checkpw(password, user.getPassword());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Get user information from JWT token claims.
     * 
     * @param username the username from JWT subject
     * @return UserResponse containing user information
     * @throws UserNotFoundException if user is not found
     */
    public UserResponse getUserFromToken(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
        return UserResponse.from(user);
    }

    /**
     * Refresh JWT token for authenticated user.
     * 
     * @param currentToken the current JWT token
     * @param username the username from token
     * @return new AuthResponse with refreshed token
     * @throws UserNotFoundException if user is not found
     */
    @Transactional
    public AuthResponse refreshToken(String currentToken, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
        
        // Check if user is still enabled
        if (!user.getEnabled()) {
            throw new AuthenticationException("Account is disabled");
        }
        
        // Generate new token
        String newToken = generateJwtToken(user);
        UserResponse userResponse = UserResponse.from(user);
        
        return AuthResponse.of(newToken, TOKEN_EXPIRATION_SECONDS, userResponse);
    }

    /**
     * Change user password.
     * 
     * @param username the username
     * @param currentPassword the current password
     * @param newPassword the new password
     * @return true if password was changed successfully
     * @throws AuthenticationException if current password is invalid
     * @throws UserNotFoundException if user is not found
     */
    @Transactional
    public boolean changePassword(String username, String currentPassword, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
        
        // Verify current password
        if (!BCrypt.checkpw(currentPassword, user.getPassword())) {
            throw new AuthenticationException("Current password is incorrect");
        }
        
        // Validate new password
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("New password must be at least 8 characters long");
        }
        
        // Hash and set new password
        user.setPassword(BCrypt.hashpw(newPassword, BCrypt.gensalt()));
        userRepository.save(user);
        
        return true;
    }

    /**
     * Reset user password (admin function).
     * 
     * @param username the username
     * @param newPassword the new password
     * @return true if password was reset successfully
     * @throws UserNotFoundException if user is not found
     */
    @Transactional
    public boolean resetPassword(String username, String newPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
        
        // Validate new password
        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException("Password must be at least 8 characters long");
        }
        
        // Hash and set new password
        user.setPassword(BCrypt.hashpw(newPassword, BCrypt.gensalt()));
        userRepository.save(user);
        
        return true;
    }

    /**
     * Verify user email address.
     * 
     * @param username the username
     * @return true if email was verified successfully
     * @throws UserNotFoundException if user is not found
     */
    @Transactional
    public boolean verifyEmail(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
        
        user.setEmailVerified(true);
        userRepository.save(user);
        
        return true;
    }

    /**
     * Get authentication statistics.
     * 
     * @return AuthStats object containing authentication statistics
     */
    public AuthStats getAuthStats() {
        long totalUsers = userRepository.count();
        long enabledUsers = userRepository.countByEnabledTrue();
        long recentLogins = userRepository.countByLastLoginAfter(LocalDateTime.now().minusDays(7));
        
        return new AuthStats(totalUsers, enabledUsers, recentLogins);
    }

    /**
     * Inner class to represent authentication statistics.
     */
    public static class AuthStats {
        private final long totalUsers;
        private final long enabledUsers;
        private final long recentLogins;

        public AuthStats(long totalUsers, long enabledUsers, long recentLogins) {
            this.totalUsers = totalUsers;
            this.enabledUsers = enabledUsers;
            this.recentLogins = recentLogins;
        }

        public long getTotalUsers() { return totalUsers; }
        public long getEnabledUsers() { return enabledUsers; }
        public long getRecentLogins() { return recentLogins; }
    }
}
