package com.api.service;

import com.api.dto.ProfileUpdateRequest;
import com.api.exception.UserNotFoundException;
import com.api.model.User;
import com.api.model.UserProfile;
import com.api.repository.UserRepository;
import com.api.repository.UserProfileRepository;
import jakarta.inject.Singleton;

import jakarta.transaction.Transactional;
import java.util.Optional;

/**
 * Service class for UserProfile-related business logic.
 * 
 * This service handles user profile management operations including
 * profile updates, profile information retrieval, and profile settings.
 * 
 * @author Implementation Developer
 */
@Singleton
public class ProfileService {

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;

    public ProfileService(UserRepository userRepository, 
                         UserProfileRepository userProfileRepository) {
        this.userRepository = userRepository;
        this.userProfileRepository = userProfileRepository;
    }

    /**
     * Get user profile by user ID.
     * 
     * @param userId the user ID
     * @return UserProfile entity
     * @throws UserNotFoundException if user or profile is not found
     */
    public UserProfile getUserProfile(Long userId) {
        return userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("User profile not found for user ID: " + userId));
    }

    /**
     * Get user profile by username.
     * 
     * @param username the username
     * @return UserProfile entity
     * @throws UserNotFoundException if user or profile is not found
     */
    public UserProfile getUserProfileByUsername(String username) {
        return userProfileRepository.findByUser_Username(username)
                .orElseThrow(() -> new UserNotFoundException("User profile not found for username: " + username));
    }

    /**
     * Update user profile information.
     * 
     * @param userId the user ID
     * @param updateRequest the profile update request
     * @return updated UserProfile entity
     * @throws UserNotFoundException if user or profile is not found
     */
    @Transactional
    public UserProfile updateUserProfile(Long userId, ProfileUpdateRequest updateRequest) {
        // Get existing profile or create new one
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
                    return new UserProfile(user);
                });

        // Update user basic information if provided
        User user = profile.getUser();
        if (updateRequest.getFirstName() != null) {
            user.setFirstName(updateRequest.getFirstName());
        }
        if (updateRequest.getLastName() != null) {
            user.setLastName(updateRequest.getLastName());
        }
        userRepository.update(user);

        // Update profile information
        updateProfileFields(profile, updateRequest);
        
        return userProfileRepository.save(profile);
    }

    /**
     * Update user profile by username.
     * 
     * @param username the username
     * @param updateRequest the profile update request
     * @return updated UserProfile entity
     * @throws UserNotFoundException if user or profile is not found
     */
    @Transactional
    public UserProfile updateUserProfileByUsername(String username, ProfileUpdateRequest updateRequest) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found with username: " + username));
        
        return updateUserProfile(user.getId(), updateRequest);
    }

    /**
     * Create user profile for existing user.
     * 
     * @param userId the user ID
     * @return created UserProfile entity
     * @throws UserNotFoundException if user is not found
     * @throws IllegalStateException if profile already exists
     */
    @Transactional
    public UserProfile createUserProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UserNotFoundException("User not found with ID: " + userId));
        
        // Check if profile already exists
        if (userProfileRepository.existsByUserId(userId)) {
            throw new IllegalStateException("Profile already exists for user ID: " + userId);
        }
        
        UserProfile profile = new UserProfile(user);
        return userProfileRepository.save(profile);
    }

    /**
     * Delete user profile.
     * 
     * @param userId the user ID
     * @throws UserNotFoundException if profile is not found
     */
    @Transactional
    public void deleteUserProfile(Long userId) {
        UserProfile profile = userProfileRepository.findByUserId(userId)
                .orElseThrow(() -> new UserNotFoundException("User profile not found for user ID: " + userId));
        
        userProfileRepository.delete(profile);
    }

    /**
     * Update profile visibility setting.
     * 
     * @param userId the user ID
     * @param visibility the new visibility setting
     * @return updated UserProfile entity
     * @throws UserNotFoundException if profile is not found
     */
    @Transactional
    public UserProfile updateProfileVisibility(Long userId, UserProfile.ProfileVisibility visibility) {
        UserProfile profile = getUserProfile(userId);
        profile.setProfileVisibility(visibility);
        return userProfileRepository.save(profile);
    }

    /**
     * Update newsletter subscription status.
     * 
     * @param userId the user ID
     * @param subscribed the subscription status
     * @return updated UserProfile entity
     * @throws UserNotFoundException if profile is not found
     */
    @Transactional
    public UserProfile updateNewsletterSubscription(Long userId, boolean subscribed) {
        UserProfile profile = getUserProfile(userId);
        profile.setNewsletterSubscribed(subscribed);
        return userProfileRepository.save(profile);
    }

    /**
     * Update profile picture URL.
     * 
     * @param userId the user ID
     * @param profilePictureUrl the new profile picture URL
     * @return updated UserProfile entity
     * @throws UserNotFoundException if profile is not found
     */
    @Transactional
    public UserProfile updateProfilePicture(Long userId, String profilePictureUrl) {
        UserProfile profile = getUserProfile(userId);
        profile.setProfilePictureUrl(profilePictureUrl);
        return userProfileRepository.save(profile);
    }

    /**
     * Check if user has a profile.
     * 
     * @param userId the user ID
     * @return true if profile exists, false otherwise
     */
    public boolean hasProfile(Long userId) {
        return userProfileRepository.existsByUserId(userId);
    }

    /**
     * Get profile statistics.
     * 
     * @return ProfileStats object containing profile statistics
     */
    public ProfileStats getProfileStats() {
        long totalProfiles = userProfileRepository.count();
        long profilesWithPictures = userProfileRepository.countByProfilePictureUrlIsNotNull();
        long profilesWithPhones = userProfileRepository.countByPhoneNumberIsNotNull();
        long newsletterSubscribers = userProfileRepository.countByNewsletterSubscribedTrue();
        
        return new ProfileStats(totalProfiles, profilesWithPictures, profilesWithPhones, newsletterSubscribers);
    }

    /**
     * Helper method to update profile fields from update request.
     * 
     * @param profile the profile to update
     * @param updateRequest the update request data
     */
    private void updateProfileFields(UserProfile profile, ProfileUpdateRequest updateRequest) {
        if (updateRequest.getPhoneNumber() != null) {
            profile.setPhoneNumber(updateRequest.getPhoneNumber());
        }
        if (updateRequest.getDateOfBirth() != null) {
            profile.setDateOfBirth(updateRequest.getDateOfBirth());
        }
        if (updateRequest.getGender() != null) {
            profile.setGender(updateRequest.getGender());
        }
        if (updateRequest.getAddress() != null) {
            profile.setAddress(updateRequest.getAddress());
        }
        if (updateRequest.getCity() != null) {
            profile.setCity(updateRequest.getCity());
        }
        if (updateRequest.getState() != null) {
            profile.setState(updateRequest.getState());
        }
        if (updateRequest.getPostalCode() != null) {
            profile.setPostalCode(updateRequest.getPostalCode());
        }
        if (updateRequest.getCountry() != null) {
            profile.setCountry(updateRequest.getCountry());
        }
        if (updateRequest.getProfilePictureUrl() != null) {
            profile.setProfilePictureUrl(updateRequest.getProfilePictureUrl());
        }
        if (updateRequest.getBio() != null) {
            profile.setBio(updateRequest.getBio());
        }
        if (updateRequest.getWebsiteUrl() != null) {
            profile.setWebsiteUrl(updateRequest.getWebsiteUrl());
        }
        if (updateRequest.getOccupation() != null) {
            profile.setOccupation(updateRequest.getOccupation());
        }
        if (updateRequest.getCompany() != null) {
            profile.setCompany(updateRequest.getCompany());
        }
        if (updateRequest.getTimezone() != null) {
            profile.setTimezone(updateRequest.getTimezone());
        }
        if (updateRequest.getLanguage() != null) {
            profile.setLanguage(updateRequest.getLanguage());
        }
        if (updateRequest.getNewsletterSubscribed() != null) {
            profile.setNewsletterSubscribed(updateRequest.getNewsletterSubscribed());
        }
        if (updateRequest.getProfileVisibility() != null) {
            profile.setProfileVisibility(updateRequest.getProfileVisibility());
        }
    }

    /**
     * Inner class to represent profile statistics.
     */
    public static class ProfileStats {
        private final long totalProfiles;
        private final long profilesWithPictures;
        private final long profilesWithPhones;
        private final long newsletterSubscribers;

        public ProfileStats(long totalProfiles, long profilesWithPictures, 
                           long profilesWithPhones, long newsletterSubscribers) {
            this.totalProfiles = totalProfiles;
            this.profilesWithPictures = profilesWithPictures;
            this.profilesWithPhones = profilesWithPhones;
            this.newsletterSubscribers = newsletterSubscribers;
        }

        public long getTotalProfiles() { return totalProfiles; }
        public long getProfilesWithPictures() { return profilesWithPictures; }
        public long getProfilesWithPhones() { return profilesWithPhones; }
        public long getNewsletterSubscribers() { return newsletterSubscribers; }
    }
}
