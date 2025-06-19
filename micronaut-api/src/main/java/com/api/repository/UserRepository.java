package com.api.repository;

import com.api.model.User;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity operations.
 * 
 * This interface extends JpaRepository to provide CRUD operations
 * and custom query methods for User entities.
 * 
 * @author Implementation Developer
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find user by username.
     * 
     * @param username the username to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByUsername(String username);

    /**
     * Find user by email address.
     * 
     * @param email the email to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Find user by username or email address.
     * 
     * @param username the username to search for
     * @param email the email to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByUsernameOrEmail(String username, String email);

    /**
     * Check if a username already exists.
     * 
     * @param username the username to check
     * @return true if username exists, false otherwise
     */
    boolean existsByUsername(String username);

    /**
     * Check if an email already exists.
     * 
     * @param email the email to check
     * @return true if email exists, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Find all enabled users.
     * 
     * @param pageable pagination information
     * @return Page of enabled users
     */
    Page<User> findByEnabledTrue(Pageable pageable);

    /**
     * Find all disabled users.
     * 
     * @param pageable pagination information
     * @return Page of disabled users
     */
    Page<User> findByEnabledFalse(Pageable pageable);

    /**
     * Find users by email verification status.
     * 
     * @param emailVerified the email verification status
     * @param pageable pagination information
     * @return Page of users with specified email verification status
     */
    Page<User> findByEmailVerified(Boolean emailVerified, Pageable pageable);

    /**
     * Find users created after a specific date.
     * 
     * @param date the date to compare against
     * @param pageable pagination information
     * @return Page of users created after the specified date
     */
    Page<User> findByCreatedAtAfter(LocalDateTime date, Pageable pageable);

    /**
     * Find users who have logged in after a specific date.
     * 
     * @param date the date to compare against
     * @param pageable pagination information
     * @return Page of users who logged in after the specified date
     */
    Page<User> findByLastLoginAfter(LocalDateTime date, Pageable pageable);

    // Note: Complex role-based queries removed for basic compilation
    // Can be added back later with proper @Join annotations or custom implementations

    /**
     * Find users by first name or last name containing the search term (case-insensitive).
     * 
     * @param firstName the first name search term
     * @param lastName the last name search term
     * @param pageable pagination information
     * @return Page of matching users
     */
    Page<User> findByFirstNameContainingIgnoreCaseOrLastNameContainingIgnoreCase(
            String firstName, String lastName, Pageable pageable);

    /**
     * Find users by username containing the search term (case-insensitive).
     * 
     * @param username the username search term
     * @param pageable pagination information
     * @return Page of matching users
     */
    Page<User> findByUsernameContainingIgnoreCase(String username, Pageable pageable);

    /**
     * Count total number of users.
     * 
     * @return total user count
     */
    long count();

    /**
     * Count enabled users.
     * 
     * @return count of enabled users
     */
    long countByEnabledTrue();

    /**
     * Count users created after a specific date.
     * 
     * @param date the date to compare against
     * @return count of users created after the date
     */
    long countByCreatedAtAfter(LocalDateTime date);

    /**
     * Count users who have logged in after a specific date.
     * 
     * @param date the date to compare against
     * @return count of users who logged in after the date
     */
    long countByLastLoginAfter(LocalDateTime date);

    /**
     * Find all users ordered by creation date (newest first).
     * 
     * @param pageable pagination information
     * @return Page of users ordered by creation date
     */
    Page<User> findAllOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Find all users ordered by last login date (most recent first).
     * Users who have never logged in will appear last.
     * 
     * @param pageable pagination information
     * @return Page of users ordered by last login date
     */
    Page<User> findAllOrderByLastLoginDesc(Pageable pageable);

    /**
     * Delete users who have been disabled and not logged in for a specified period.
     * 
     * @param date the cutoff date for last login
     * @return number of deleted users
     */
    long deleteByEnabledFalseAndLastLoginBefore(LocalDateTime date);
}
