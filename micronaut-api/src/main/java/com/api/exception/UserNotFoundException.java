package com.api.exception;

/**
 * Exception thrown when a user is not found.
 * 
 * This runtime exception is thrown when attempting to access
 * user data that doesn't exist in the system.
 * 
 * @author Implementation Developer
 */
public class UserNotFoundException extends RuntimeException {

    /**
     * Constructs a new UserNotFoundException with the specified detail message.
     * 
     * @param message the detail message
     */
    public UserNotFoundException(String message) {
        super(message);
    }

    /**
     * Constructs a new UserNotFoundException with the specified detail message and cause.
     * 
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public UserNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructs a new UserNotFoundException with the specified cause.
     * 
     * @param cause the cause of the exception
     */
    public UserNotFoundException(Throwable cause) {
        super(cause);
    }

    /**
     * Creates a UserNotFoundException for a user ID.
     * 
     * @param userId the user ID that was not found
     * @return UserNotFoundException instance
     */
    public static UserNotFoundException forUserId(Long userId) {
        return new UserNotFoundException("User not found with ID: " + userId);
    }

    /**
     * Creates a UserNotFoundException for a username.
     * 
     * @param username the username that was not found
     * @return UserNotFoundException instance
     */
    public static UserNotFoundException forUsername(String username) {
        return new UserNotFoundException("User not found with username: " + username);
    }

    /**
     * Creates a UserNotFoundException for an email.
     * 
     * @param email the email that was not found
     * @return UserNotFoundException instance
     */
    public static UserNotFoundException forEmail(String email) {
        return new UserNotFoundException("User not found with email: " + email);
    }
}
