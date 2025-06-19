package com.example.service;

import com.example.model.Role;
import com.example.model.User;
import com.example.repository.UserRepository;
import com.example.security.AuthenticationProviderUserPassword;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

@Singleton
public class UserService {
    
    private final UserRepository userRepository;
    
    @Inject
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    /**
     * Create a new user with hashed password
     */
    @Transactional
    public User createUser(String username, String email, String plainPassword, Set<Role> roles) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email already exists");
        }
        
        String hashedPassword = AuthenticationProviderUserPassword.hashPassword(plainPassword);
        User user = new User(username, email, hashedPassword);
        
        if (roles != null && !roles.isEmpty()) {
            user.setRoles(roles);
        }
        
        return userRepository.save(user);
    }
    
    /**
     * Find user by username
     */
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }
    
    /**
     * Find user by email
     */
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
    
    /**
     * Update user password
     */
    @Transactional
    public void updatePassword(String username, String newPlainPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        String hashedPassword = AuthenticationProviderUserPassword.hashPassword(newPlainPassword);
        user.setPassword(hashedPassword);
        userRepository.save(user);
    }
    
    /**
     * Enable or disable user account
     */
    @Transactional
    public void setUserEnabled(String username, boolean enabled) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.setEnabled(enabled);
        userRepository.save(user);
    }
    
    /**
     * Add role to user
     */
    @Transactional
    public void addRoleToUser(String username, Role role) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.addRole(role);
        userRepository.save(user);
    }
    
    /**
     * Remove role from user
     */
    @Transactional
    public void removeRoleFromUser(String username, Role role) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.removeRole(role);
        userRepository.save(user);
    }
    
    /**
     * Update last login time
     */
    @Transactional
    public void updateLastLogin(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }
    
    /**
     * Check if username is available
     */
    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }
    
    /**
     * Check if email is available
     */
    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
    }
}