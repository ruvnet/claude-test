package com.api.repository;

import com.api.model.UserProfile;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for UserProfile entity operations.
 * 
 * This interface extends JpaRepository to provide CRUD operations
 * and custom query methods for UserProfile entities.
 * 
 * @author Implementation Developer
 */
@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

    /**
     * Find user profile by user ID.
     * 
     * @param userId the user ID to search for
     * @return Optional containing the user profile if found
     */
    Optional<UserProfile> findByUserId(Long userId);

    /**
     * Find user profile by username.
     * 
     * @param username the username to search for
     * @return Optional containing the user profile if found
     */
    Optional<UserProfile> findByUser_Username(String username);

    /**
     * Find user profile by email.
     * 
     * @param email the email to search for
     * @return Optional containing the user profile if found
     */
    Optional<UserProfile> findByUser_Email(String email);

    /**
     * Check if a user profile exists for a given user ID.
     * 
     * @param userId the user ID to check
     * @return true if profile exists, false otherwise
     */
    boolean existsByUserId(Long userId);

    /**
     * Find profiles by city.
     * 
     * @param city the city to search for
     * @param pageable pagination information
     * @return Page of profiles in the specified city
     */
    Page<UserProfile> findByCity(String city, Pageable pageable);

    /**
     * Find profiles by country.
     * 
     * @param country the country to search for
     * @param pageable pagination information
     * @return Page of profiles in the specified country
     */
    Page<UserProfile> findByCountry(String country, Pageable pageable);

    /**
     * Find profiles by state.
     * 
     * @param state the state to search for
     * @param pageable pagination information
     * @return Page of profiles in the specified state
     */
    Page<UserProfile> findByState(String state, Pageable pageable);

    /**
     * Find profiles by gender.
     * 
     * @param gender the gender to search for
     * @param pageable pagination information
     * @return Page of profiles with the specified gender
     */
    Page<UserProfile> findByGender(UserProfile.Gender gender, Pageable pageable);

    /**
     * Find profiles by occupation.
     * 
     * @param occupation the occupation to search for
     * @param pageable pagination information
     * @return Page of profiles with the specified occupation
     */
    Page<UserProfile> findByOccupation(String occupation, Pageable pageable);

    /**
     * Find profiles by company.
     * 
     * @param company the company to search for
     * @param pageable pagination information
     * @return Page of profiles with the specified company
     */
    Page<UserProfile> findByCompany(String company, Pageable pageable);

    /**
     * Find profiles by profile visibility.
     * 
     * @param visibility the profile visibility to search for
     * @param pageable pagination information
     * @return Page of profiles with the specified visibility
     */
    Page<UserProfile> findByProfileVisibility(UserProfile.ProfileVisibility visibility, Pageable pageable);

    /**
     * Find profiles by newsletter subscription status.
     * 
     * @param subscribed the subscription status
     * @param pageable pagination information
     * @return Page of profiles with the specified subscription status
     */
    Page<UserProfile> findByNewsletterSubscribed(Boolean subscribed, Pageable pageable);

    /**
     * Find profiles by birth year.
     * 
     * @param year the birth year to search for
     * @param pageable pagination information
     * @return Page of profiles with birth year matching the specified year
     */
    Page<UserProfile> findByDateOfBirthBetween(LocalDate startDate, LocalDate endDate, Pageable pageable);

    /**
     * Find profiles by age range (calculated from date of birth).
     * 
     * @param minAge minimum age
     * @param maxAge maximum age
     * @param pageable pagination information
     * @return Page of profiles within the specified age range
     */
    default Page<UserProfile> findByAgeRange(int minAge, int maxAge, Pageable pageable) {
        LocalDate today = LocalDate.now();
        LocalDate maxBirthDate = today.minusYears(minAge);
        LocalDate minBirthDate = today.minusYears(maxAge + 1);
        return findByDateOfBirthBetween(minBirthDate, maxBirthDate, pageable);
    }

    /**
     * Find profiles by city and country.
     * 
     * @param city the city to search for
     * @param country the country to search for
     * @param pageable pagination information
     * @return Page of profiles in the specified city and country
     */
    Page<UserProfile> findByCityAndCountry(String city, String country, Pageable pageable);

    /**
     * Find profiles by timezone.
     * 
     * @param timezone the timezone to search for
     * @param pageable pagination information
     * @return Page of profiles in the specified timezone
     */
    Page<UserProfile> findByTimezone(String timezone, Pageable pageable);

    /**
     * Find profiles by language.
     * 
     * @param language the language to search for
     * @param pageable pagination information
     * @return Page of profiles with the specified language
     */
    Page<UserProfile> findByLanguage(String language, Pageable pageable);

    /**
     * Find profiles with phone numbers.
     * 
     * @param pageable pagination information
     * @return Page of profiles that have phone numbers
     */
    Page<UserProfile> findByPhoneNumberIsNotNull(Pageable pageable);

    /**
     * Find profiles with websites.
     * 
     * @param pageable pagination information
     * @return Page of profiles that have website URLs
     */
    Page<UserProfile> findByWebsiteUrlIsNotNull(Pageable pageable);

    /**
     * Find profiles with profile pictures.
     * 
     * @param pageable pagination information
     * @return Page of profiles that have profile pictures
     */
    Page<UserProfile> findByProfilePictureUrlIsNotNull(Pageable pageable);

    /**
     * Count profiles by country.
     * 
     * @param country the country to count
     * @return count of profiles in the specified country
     */
    long countByCountry(String country);

    /**
     * Count profiles by gender.
     * 
     * @param gender the gender to count
     * @return count of profiles with the specified gender
     */
    long countByGender(UserProfile.Gender gender);

    /**
     * Count profiles with newsletter subscription.
     * 
     * @return count of profiles subscribed to newsletter
     */
    long countByNewsletterSubscribedTrue();

    /**
     * Count profiles with profile pictures.
     * 
     * @return count of profiles with profile pictures
     */
    long countByProfilePictureUrlIsNotNull();

    /**
     * Count profiles with phone numbers.
     * 
     * @return count of profiles with phone numbers
     */
    long countByPhoneNumberIsNotNull();
}
