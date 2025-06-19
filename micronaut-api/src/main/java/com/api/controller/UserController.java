package com.api.controller;

import com.api.dto.UserResponse;
import com.api.model.User;
import com.api.service.UserService;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.*;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.rules.SecurityRule;
import io.micronaut.validation.Validated;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
 * REST controller for user management endpoints.
 * 
 * This controller handles user CRUD operations, user search,
 * and user profile management for authenticated users.
 * 
 * @author Implementation Developer
 */
@Controller("/api/users")
@Validated
@Secured(SecurityRule.IS_AUTHENTICATED)
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "User Management", description = "User management and profile endpoints")
public class UserController {

    private static final Logger LOG = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;

    @Inject
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Get all users with pagination.
     * 
     * @param pageable pagination parameters
     * @return HTTP response with paginated user list
     */
    @Get
    @Operation(
        summary = "Get all users",
        description = "Retrieves a paginated list of all users"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Users retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<Page<UserResponse>> getAllUsers(
            @Parameter(description = "Pagination parameters") Pageable pageable) {
        LOG.debug("Retrieving all users with pagination: {}", pageable);
        
        Page<UserResponse> users = userService.getAllUsers(pageable);
        LOG.debug("Retrieved {} users", users.getContent().size());
        
        return HttpResponse.ok(users);
    }

    /**
     * Get user by ID.
     * 
     * @param id the user ID
     * @return HTTP response with user information
     */
    @Get("/{id}")
    @Operation(
        summary = "Get user by ID",
        description = "Retrieves user information by user ID"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User found"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<UserResponse> getUserById(
            @Parameter(description = "User ID") @PathVariable Long id) {
        LOG.debug("Retrieving user by ID: {}", id);
        
        UserResponse user = userService.findUserById(id);
        LOG.debug("Found user: {}", user.getUsername());
        
        return HttpResponse.ok(user);
    }

    /**
     * Get user by username.
     * 
     * @param username the username
     * @return HTTP response with user information
     */
    @Get("/username/{username}")
    @Operation(
        summary = "Get user by username",
        description = "Retrieves user information by username"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User found"),
        @ApiResponse(responseCode = "404", description = "User not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<UserResponse> getUserByUsername(
            @Parameter(description = "Username") @PathVariable String username) {
        LOG.debug("Retrieving user by username: {}", username);
        
        UserResponse user = userService.findUserByUsername(username);
        LOG.debug("Found user: {}", user.getUsername());
        
        return HttpResponse.ok(user);
    }

    /**
     * Update user information.
     * 
     * @param id the user ID
     * @param updateRequest the user update data
     * @param principal the authenticated principal
     * @return HTTP response with updated user information
     */
    @Put("/{id}")
    @Operation(
        summary = "Update user",
        description = "Updates user information (users can only update their own profile unless admin)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid update data"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public HttpResponse<UserResponse> updateUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            @Body @Valid UserUpdateRequest updateRequest,
            Principal principal) {
        LOG.info("User update request for ID: {} by user: {}", id, principal.getName());
        
        // Check if user is updating their own profile or is admin
        UserResponse currentUser = userService.findUserByUsername(principal.getName());
        if (!currentUser.getId().equals(id) && !isAdmin(currentUser)) {
            LOG.warn("User {} attempted to update user {}", principal.getName(), id);
            return HttpResponse.status(HttpStatus.FORBIDDEN);
        }
        
        User updateData = new User();
        updateData.setFirstName(updateRequest.getFirstName());
        updateData.setLastName(updateRequest.getLastName());
        
        UserResponse updatedUser = userService.updateUser(id, updateData);
        LOG.info("User updated successfully: {}", updatedUser.getUsername());
        
        return HttpResponse.ok(updatedUser);
    }

    /**
     * Delete user by ID (admin only).
     * 
     * @param id the user ID
     * @param principal the authenticated principal
     * @return HTTP response with success message
     */
    @Delete("/{id}")
    @Secured("ROLE_ADMIN")
    @Operation(
        summary = "Delete user",
        description = "Deletes a user by ID (admin only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User deleted successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public HttpResponse<?> deleteUser(
            @Parameter(description = "User ID") @PathVariable Long id,
            Principal principal) {
        LOG.info("User deletion request for ID: {} by admin: {}", id, principal.getName());
        
        userService.deleteUser(id);
        LOG.info("User deleted successfully: {}", id);
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "User deleted successfully");
        
        return HttpResponse.ok(response);
    }

    /**
     * Search users by search term.
     * 
     * @param searchTerm the search term
     * @param pageable pagination parameters
     * @return HTTP response with search results
     */
    @Get("/search")
    @Operation(
        summary = "Search users",
        description = "Searches users by username, first name, or last name"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Search completed successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<Page<UserResponse>> searchUsers(
            @Parameter(description = "Search term") @QueryValue String q,
            @Parameter(description = "Pagination parameters") Pageable pageable) {
        LOG.debug("User search request: {}", q);
        
        Page<UserResponse> users = userService.searchUsers(q, pageable);
        LOG.debug("Found {} users matching search term", users.getContent().size());
        
        return HttpResponse.ok(users);
    }

    /**
     * Get enabled users only.
     * 
     * @param pageable pagination parameters
     * @return HTTP response with enabled users
     */
    @Get("/enabled")
    @Operation(
        summary = "Get enabled users",
        description = "Retrieves a paginated list of enabled users only"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Enabled users retrieved successfully"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<Page<UserResponse>> getEnabledUsers(
            @Parameter(description = "Pagination parameters") Pageable pageable) {
        LOG.debug("Retrieving enabled users with pagination: {}", pageable);
        
        Page<UserResponse> users = userService.getEnabledUsers(pageable);
        LOG.debug("Retrieved {} enabled users", users.getContent().size());
        
        return HttpResponse.ok(users);
    }

    /**
     * Enable or disable a user (admin only).
     * 
     * @param id the user ID
     * @param enableRequest the enable/disable request
     * @param principal the authenticated principal
     * @return HTTP response with updated user information
     */
    @Put("/{id}/status")
    @Secured("ROLE_ADMIN")
    @Operation(
        summary = "Enable/disable user",
        description = "Enables or disables a user account (admin only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "User status updated successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    public HttpResponse<UserResponse> setUserStatus(
            @Parameter(description = "User ID") @PathVariable Long id,
            @Body @Valid UserStatusRequest enableRequest,
            Principal principal) {
        LOG.info("User status change request for ID: {} to {} by admin: {}", 
                 id, enableRequest.isEnabled(), principal.getName());
        
        UserResponse updatedUser = userService.setUserEnabled(id, enableRequest.isEnabled());
        LOG.info("User status updated successfully: {} -> {}", 
                 updatedUser.getUsername(), updatedUser.getEnabled());
        
        return HttpResponse.ok(updatedUser);
    }

    /**
     * Get user statistics (admin only).
     * 
     * @return HTTP response with user statistics
     */
    @Get("/stats")
    @Secured("ROLE_ADMIN")
    @Operation(
        summary = "Get user statistics",
        description = "Returns user statistics (admin only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public HttpResponse<UserService.UserStats> getUserStats() {
        LOG.debug("User statistics requested");
        
        UserService.UserStats stats = userService.getUserStats();
        return HttpResponse.ok(stats);
    }

    /**
     * Helper method to check if user has admin role.
     * 
     * @param user the user to check
     * @return true if user is admin
     */
    private boolean isAdmin(UserResponse user) {
        return user.getRoles().contains("ROLE_ADMIN");
    }

    /**
     * DTO for user update requests.
     */
    public static class UserUpdateRequest {
        @jakarta.validation.constraints.Size(max = 50, message = "First name cannot exceed 50 characters")
        private String firstName;
        
        @jakarta.validation.constraints.Size(max = 50, message = "Last name cannot exceed 50 characters")
        private String lastName;
        
        // Getters and setters
        public String getFirstName() { return firstName; }
        public void setFirstName(String firstName) { this.firstName = firstName; }
        public String getLastName() { return lastName; }
        public void setLastName(String lastName) { this.lastName = lastName; }
    }

    /**
     * DTO for user status requests.
     */
    public static class UserStatusRequest {
        @jakarta.validation.constraints.NotNull(message = "Enabled status is required")
        private Boolean enabled;
        
        // Getters and setters
        public Boolean isEnabled() { return enabled; }
        public void setEnabled(Boolean enabled) { this.enabled = enabled; }
    }
}
