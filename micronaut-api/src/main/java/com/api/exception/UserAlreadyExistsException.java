package com.api.exception;

/**
 * Exception thrown when attempting to create a user that already exists.
 * 
 * This runtime exception is thrown when trying to register a user
 * with a username or email that already exists in the system.
 * 
 * @author Implementation Developer
 */
public class UserAlreadyExistsException extends RuntimeException {

    /**
     * Constructs a new UserAlreadyExistsException with the specified detail message.
     * 
     * @param message the detail message
     */
    public UserAlreadyExistsException(String message) {
        super(message);
    }

    /**
     * Constructs a new UserAlreadyExistsException with the specified detail message and cause.
     * 
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public UserAlreadyExistsException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructs a new UserAlreadyExistsException with the specified cause.
     * 
     * @param cause the cause of the exception
     */
    public UserAlreadyExistsException(Throwable cause) {
        super(cause);
    }

    /**
     * Creates a UserAlreadyExistsException for a username.
     * 
     * @param username the username that already exists
     * @return UserAlreadyExistsException instance
     */
    public static UserAlreadyExistsException forUsername(String username) {
        return new UserAlreadyExistsException("Username already exists: " + username);
    }

    /**
     * Creates a UserAlreadyExistsException for an email.
     * 
     * @param email the email that already exists
     * @return UserAlreadyExistsException instance
     */
    public static UserAlreadyExistsException forEmail(String email) {
        return new UserAlreadyExistsException("Email already exists: " + email);
    }
}
