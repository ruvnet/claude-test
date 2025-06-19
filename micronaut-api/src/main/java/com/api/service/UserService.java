package com.api.service;

import com.api.dto.UserRegistrationRequest;
import com.api.dto.UserResponse;
import com.api.exception.UserAlreadyExistsException;
import com.api.exception.UserNotFoundException;
import com.api.model.Role;
import com.api.model.User;
import com.api.model.UserProfile;
import com.api.repository.RoleRepository;
import com.api.repository.UserRepository;
import com.api.repository.UserProfileRepository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import jakarta.inject.Singleton;
import org.mindrot.jbcrypt.BCrypt;

import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Service class for User-related business logic.
 * 
 * This service handles user management operations including
 * registration, profile management, and user queries.
 * 
 * @author Implementation Developer
 */
@Singleton
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserProfileRepository userProfileRepository;

    public UserService(UserRepository userRepository, 
                      RoleRepository roleRepository,
                      UserProfileRepository userProfileRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userProfileRepository = userProfileRepository;
    }

    /**
     * Register a new user.
     * 
     * @param registrationRequest the registration request data
     * @return UserResponse containing the created user information
     * @throws UserAlreadyExistsException if username or email already exists
     */
    @Transactional
    public UserResponse registerUser(UserRegistrationRequest registrationRequest) {
        // Check if username already exists
        if (userRepository.existsByUsername(registrationRequest.getUsername())) {
            throw new UserAlreadyExistsException("Username already exists: " + registrationRequest.getUsername());
        }

        // Check if email already exists
        if (userRepository.existsByEmail(registrationRequest.getEmail())) {
            throw new UserAlreadyExistsException("Email already exists: " + registrationRequest.getEmail());
        }

        // Validate password confirmation
        if (!registrationRequest.isPasswordsMatch()) {
            throw new IllegalArgumentException("Passwords do not match");
        }

        // Create new user
        User user = new User();
        user.setUsername(registrationRequest.getUsername());
        user.setEmail(registrationRequest.getEmail());
        user.setPassword(BCrypt.hashpw(registrationRequest.getPassword(), BCrypt.gensalt()));
        user.setFirstName(registrationRequest.getFirstName());
        user.setLastName(registrationRequest.getLastName());
        user.setEnabled(true);
        user.setEmailVerified(false);

        // Assign default role
        Optional<Role> userRole = roleRepository.findByName(Role.USER);
        if (userRole.isPresent()) {
            user.addRole(userRole.get());
        } else {
            // Create default USER role if it doesn't exist
            Role defaultRole = new Role(Role.USER, "Default user role");
            roleRepository.save(defaultRole);
            user.addRole(defaultRole);
        }

        // Save user
        User savedUser = userRepository.save(user);

        // Create user profile
        UserProfile profile = new UserProfile(savedUser);
        userProfileRepository.save(profile);
        savedUser.setProfile(profile);

        return UserResponse.from(savedUser);
    }

    /**
     * Find user by ID.
     * 
     * @param id the user ID
     * @return UserResponse containing user information
     * @throws UserNotFoundException if user is not found
     */
    public UserResponse findUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        return UserResponse.from(user);
    }

    /**
     * Find user by username.
     * 
     * @param username the username
     * @return UserResponse containing user information
     * @throws UserNotFoundException if user is not found
     */
    public UserResponse findUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found with username: " + username));
        return UserResponse.from(user);
    }

    /**
     * Find user by email.
     * 
     * @param email the email address
     * @return UserResponse containing user information
     * @throws UserNotFoundException if user is not found
     */
    public UserResponse findUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        return UserResponse.from(user);
    }

    /**
     * Get all users with pagination.
     * 
     * @param pageable pagination information
     * @return Page of UserResponse objects
     */
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return userRepository.findAllOrderByCreatedAtDesc(pageable)
                .map(UserResponse::from);
    }

    /**
     * Get enabled users with pagination.
     * 
     * @param pageable pagination information
     * @return Page of enabled UserResponse objects
     */
    public Page<UserResponse> getEnabledUsers(Pageable pageable) {
        return userRepository.findByEnabledTrue(pageable)
                .map(UserResponse::from);
    }

    /**
     * Search users by username, first name, or last name.
     * 
     * @param searchTerm the search term
     * @param pageable pagination information
     * @return Page of matching UserResponse objects
     */
    public Page<UserResponse> searchUsers(String searchTerm, Pageable pageable) {
        return userRepository.findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
                searchTerm, searchTerm, pageable)
                .map(UserResponse::from);
    }

    /**
     * Update user information.
     * 
     * @param id the user ID
     * @param updateData the updated user data
     * @return UserResponse containing updated user information
     * @throws UserNotFoundException if user is not found
     */
    @Transactional
    public UserResponse updateUser(Long id, User updateData) {
        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));

        // Update allowed fields
        if (updateData.getFirstName() != null) {
            existingUser.setFirstName(updateData.getFirstName());
        }
        if (updateData.getLastName() != null) {
            existingUser.setLastName(updateData.getLastName());
        }
        if (updateData.getEnabled() != null) {
            existingUser.setEnabled(updateData.getEnabled());
        }

        User savedUser = userRepository.save(existingUser);
        return UserResponse.from(savedUser);
    }

    /**
     * Enable or disable a user.
     * 
     * @param id the user ID
     * @param enabled the enabled status
     * @return UserResponse containing updated user information
     * @throws UserNotFoundException if user is not found
     */
    @Transactional
    public UserResponse setUserEnabled(Long id, boolean enabled) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        
        user.setEnabled(enabled);
        User savedUser = userRepository.save(user);
        return UserResponse.from(savedUser);
    }

    /**
     * Delete a user.
     * 
     * @param id the user ID
     * @throws UserNotFoundException if user is not found
     */
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
    }

    /**
     * Update user's last login timestamp.
     * 
     * @param username the username
     */
    @Transactional
    public void updateLastLogin(String username) {
        User user = userRepository.findByUsername(username).orElse(null);
        if (user != null) {
            user.setLastLogin(LocalDateTime.now());
            userRepository.save(user);
        }
    }

    /**
     * Check if username is available.
     * 
     * @param username the username to check
     * @return true if available, false if taken
     */
    public boolean isUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }

    /**
     * Check if email is available.
     * 
     * @param email the email to check
     * @return true if available, false if taken
     */
    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
    }

    /**
     * Get user statistics.
     * 
     * @return UserStats object containing user statistics
     */
    public UserStats getUserStats() {
        long totalUsers = userRepository.count();
        long enabledUsers = userRepository.countByEnabledTrue();
        long recentUsers = userRepository.countByCreatedAtAfter(LocalDateTime.now().minusDays(30));
        
        return new UserStats(totalUsers, enabledUsers, totalUsers - enabledUsers, recentUsers);
    }

    /**
     * Inner class to represent user statistics.
     */
    public static class UserStats {
        private final long totalUsers;
        private final long enabledUsers;
        private final long disabledUsers;
        private final long recentUsers;

        public UserStats(long totalUsers, long enabledUsers, long disabledUsers, long recentUsers) {
            this.totalUsers = totalUsers;
            this.enabledUsers = enabledUsers;
            this.disabledUsers = disabledUsers;
            this.recentUsers = recentUsers;
        }

        public long getTotalUsers() { return totalUsers; }
        public long getEnabledUsers() { return enabledUsers; }
        public long getDisabledUsers() { return disabledUsers; }
        public long getRecentUsers() { return recentUsers; }
    }
}
