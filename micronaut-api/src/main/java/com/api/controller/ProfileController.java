package com.api.controller;

import com.api.dto.ProfileUpdateRequest;
import com.api.dto.UserResponse;
import com.api.model.UserProfile;
import com.api.service.ProfileService;
import com.api.service.UserService;
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
 * REST controller for user profile management endpoints.
 * 
 * This controller handles user profile operations including
 * profile retrieval, updates, and profile settings management.
 * 
 * @author Implementation Developer
 */
@Controller("/api/profile")
@Validated
@Secured(SecurityRule.IS_AUTHENTICATED)
@SecurityRequirement(name = "BearerAuth")
@Tag(name = "User Profile", description = "User profile management endpoints")
public class ProfileController {

    private static final Logger LOG = LoggerFactory.getLogger(ProfileController.class);

    private final ProfileService profileService;
    private final UserService userService;

    @Inject
    public ProfileController(ProfileService profileService, UserService userService) {
        this.profileService = profileService;
        this.userService = userService;
    }

    /**
     * Get current user's profile.
     * 
     * @param principal the authenticated principal
     * @return HTTP response with user profile information
     */
    @Get
    @Operation(
        summary = "Get current user profile",
        description = "Retrieves the profile information for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Profile not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<UserProfile> getCurrentUserProfile(Principal principal) {
        LOG.debug("Profile retrieval request for user: {}", principal.getName());
        
        UserProfile profile = profileService.getUserProfileByUsername(principal.getName());
        LOG.debug("Profile retrieved for user: {}", principal.getName());
        
        return HttpResponse.ok(profile);
    }

    /**
     * Update current user's profile.
     * 
     * @param updateRequest the profile update request
     * @param principal the authenticated principal
     * @return HTTP response with updated profile information
     */
    @Put
    @Operation(
        summary = "Update current user profile",
        description = "Updates the profile information for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid update data"),
        @ApiResponse(responseCode = "404", description = "Profile not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<UserProfile> updateCurrentUserProfile(
            @Body @Valid ProfileUpdateRequest updateRequest,
            Principal principal) {
        LOG.info("Profile update request for user: {}", principal.getName());
        
        UserProfile updatedProfile = profileService.updateUserProfileByUsername(
                principal.getName(), updateRequest);
        LOG.info("Profile updated successfully for user: {}", principal.getName());
        
        return HttpResponse.ok(updatedProfile);
    }

    /**
     * Get user profile by user ID (admin or own profile only).
     * 
     * @param userId the user ID
     * @param principal the authenticated principal
     * @return HTTP response with user profile information
     */
    @Get("/{userId}")
    @Operation(
        summary = "Get user profile by ID",
        description = "Retrieves user profile by ID (admin or own profile only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "Profile not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<UserProfile> getUserProfile(
            @Parameter(description = "User ID") @PathVariable Long userId,
            Principal principal) {
        LOG.debug("Profile retrieval request for user ID: {} by user: {}", userId, principal.getName());
        
        // Check if user is accessing their own profile or is admin
        UserResponse currentUser = userService.findUserByUsername(principal.getName());
        if (!currentUser.getId().equals(userId) && !isAdmin(currentUser)) {
            LOG.warn("User {} attempted to access profile for user ID {}", principal.getName(), userId);
            return HttpResponse.status(HttpStatus.FORBIDDEN);
        }
        
        UserProfile profile = profileService.getUserProfile(userId);
        LOG.debug("Profile retrieved for user ID: {}", userId);
        
        return HttpResponse.ok(profile);
    }

    /**
     * Update user profile by user ID (admin only).
     * 
     * @param userId the user ID
     * @param updateRequest the profile update request
     * @param principal the authenticated principal
     * @return HTTP response with updated profile information
     */
    @Put("/{userId}")
    @Secured("ROLE_ADMIN")
    @Operation(
        summary = "Update user profile by ID",
        description = "Updates user profile by ID (admin only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid update data"),
        @ApiResponse(responseCode = "403", description = "Access denied"),
        @ApiResponse(responseCode = "404", description = "Profile not found")
    })
    public HttpResponse<UserProfile> updateUserProfile(
            @Parameter(description = "User ID") @PathVariable Long userId,
            @Body @Valid ProfileUpdateRequest updateRequest,
            Principal principal) {
        LOG.info("Profile update request for user ID: {} by admin: {}", userId, principal.getName());
        
        UserProfile updatedProfile = profileService.updateUserProfile(userId, updateRequest);
        LOG.info("Profile updated successfully for user ID: {}", userId);
        
        return HttpResponse.ok(updatedProfile);
    }

    /**
     * Update profile visibility setting.
     * 
     * @param visibilityRequest the visibility update request
     * @param principal the authenticated principal
     * @return HTTP response with success message
     */
    @Put("/visibility")
    @Operation(
        summary = "Update profile visibility",
        description = "Updates the profile visibility setting for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Visibility updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid visibility value"),
        @ApiResponse(responseCode = "404", description = "Profile not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<?> updateProfileVisibility(
            @Body @Valid ProfileVisibilityRequest visibilityRequest,
            Principal principal) {
        LOG.info("Profile visibility update request for user: {} to {}", 
                 principal.getName(), visibilityRequest.getVisibility());
        
        UserResponse currentUser = userService.findUserByUsername(principal.getName());
        UserProfile updatedProfile = profileService.updateProfileVisibility(
                currentUser.getId(), visibilityRequest.getVisibility());
        
        LOG.info("Profile visibility updated successfully for user: {}", principal.getName());
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Profile visibility updated successfully");
        response.put("visibility", updatedProfile.getProfileVisibility());
        
        return HttpResponse.ok(response);
    }

    /**
     * Update newsletter subscription status.
     * 
     * @param subscriptionRequest the subscription update request
     * @param principal the authenticated principal
     * @return HTTP response with success message
     */
    @Put("/newsletter")
    @Operation(
        summary = "Update newsletter subscription",
        description = "Updates the newsletter subscription status for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Subscription updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request data"),
        @ApiResponse(responseCode = "404", description = "Profile not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<?> updateNewsletterSubscription(
            @Body @Valid NewsletterSubscriptionRequest subscriptionRequest,
            Principal principal) {
        LOG.info("Newsletter subscription update request for user: {} to {}", 
                 principal.getName(), subscriptionRequest.isSubscribed());
        
        UserResponse currentUser = userService.findUserByUsername(principal.getName());
        UserProfile updatedProfile = profileService.updateNewsletterSubscription(
                currentUser.getId(), subscriptionRequest.isSubscribed());
        
        LOG.info("Newsletter subscription updated successfully for user: {}", principal.getName());
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Newsletter subscription updated successfully");
        response.put("subscribed", updatedProfile.getNewsletterSubscribed());
        
        return HttpResponse.ok(response);
    }

    /**
     * Update profile picture.
     * 
     * @param pictureRequest the profile picture update request
     * @param principal the authenticated principal
     * @return HTTP response with success message
     */
    @Put("/picture")
    @Operation(
        summary = "Update profile picture",
        description = "Updates the profile picture URL for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile picture updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid picture URL"),
        @ApiResponse(responseCode = "404", description = "Profile not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<?> updateProfilePicture(
            @Body @Valid ProfilePictureRequest pictureRequest,
            Principal principal) {
        LOG.info("Profile picture update request for user: {}", principal.getName());
        
        UserResponse currentUser = userService.findUserByUsername(principal.getName());
        UserProfile updatedProfile = profileService.updateProfilePicture(
                currentUser.getId(), pictureRequest.getProfilePictureUrl());
        
        LOG.info("Profile picture updated successfully for user: {}", principal.getName());
        
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Profile picture updated successfully");
        response.put("profilePictureUrl", updatedProfile.getProfilePictureUrl());
        
        return HttpResponse.ok(response);
    }

    /**
     * Delete current user's profile.
     * 
     * @param principal the authenticated principal
     * @return HTTP response with success message
     */
    @Delete
    @Operation(
        summary = "Delete current user profile",
        description = "Deletes the profile for the authenticated user"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Profile deleted successfully"),
        @ApiResponse(responseCode = "404", description = "Profile not found"),
        @ApiResponse(responseCode = "401", description = "Unauthorized access")
    })
    public HttpResponse<?> deleteCurrentUserProfile(Principal principal) {
        LOG.info("Profile deletion request for user: {}", principal.getName());
        
        UserResponse currentUser = userService.findUserByUsername(principal.getName());
        profileService.deleteUserProfile(currentUser.getId());
        
        LOG.info("Profile deleted successfully for user: {}", principal.getName());
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "Profile deleted successfully");
        
        return HttpResponse.ok(response);
    }

    /**
     * Get profile statistics (admin only).
     * 
     * @return HTTP response with profile statistics
     */
    @Get("/stats")
    @Secured("ROLE_ADMIN")
    @Operation(
        summary = "Get profile statistics",
        description = "Returns profile statistics (admin only)"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Statistics retrieved successfully"),
        @ApiResponse(responseCode = "403", description = "Access denied")
    })
    public HttpResponse<ProfileService.ProfileStats> getProfileStats() {
        LOG.debug("Profile statistics requested");
        
        ProfileService.ProfileStats stats = profileService.getProfileStats();
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
     * DTO for profile visibility requests.
     */
    public static class ProfileVisibilityRequest {
        @jakarta.validation.constraints.NotNull(message = "Visibility is required")
        private UserProfile.ProfileVisibility visibility;
        
        public UserProfile.ProfileVisibility getVisibility() { return visibility; }
        public void setVisibility(UserProfile.ProfileVisibility visibility) { this.visibility = visibility; }
    }

    /**
     * DTO for newsletter subscription requests.
     */
    public static class NewsletterSubscriptionRequest {
        @jakarta.validation.constraints.NotNull(message = "Subscription status is required")
        private Boolean subscribed;
        
        public Boolean isSubscribed() { return subscribed; }
        public void setSubscribed(Boolean subscribed) { this.subscribed = subscribed; }
    }

    /**
     * DTO for profile picture requests.
     */
    public static class ProfilePictureRequest {
        @jakarta.validation.constraints.NotBlank(message = "Profile picture URL is required")
        @jakarta.validation.constraints.Size(max = 500, message = "Profile picture URL cannot exceed 500 characters")
        private String profilePictureUrl;
        
        public String getProfilePictureUrl() { return profilePictureUrl; }
        public void setProfilePictureUrl(String profilePictureUrl) { this.profilePictureUrl = profilePictureUrl; }
    }
}
