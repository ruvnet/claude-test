package com.api.exception;

/**
 * Exception thrown when authentication fails.
 * 
 * This runtime exception is thrown when user authentication
 * fails due to invalid credentials or other authentication issues.
 * 
 * @author Implementation Developer
 */
public class AuthenticationException extends RuntimeException {

    /**
     * Constructs a new AuthenticationException with the specified detail message.
     * 
     * @param message the detail message
     */
    public AuthenticationException(String message) {
        super(message);
    }

    /**
     * Constructs a new AuthenticationException with the specified detail message and cause.
     * 
     * @param message the detail message
     * @param cause the cause of the exception
     */
    public AuthenticationException(String message, Throwable cause) {
        super(message, cause);
    }

    /**
     * Constructs a new AuthenticationException with the specified cause.
     * 
     * @param cause the cause of the exception
     */
    public AuthenticationException(Throwable cause) {
        super(cause);
    }

    /**
     * Creates an AuthenticationException for invalid credentials.
     * 
     * @return AuthenticationException instance
     */
    public static AuthenticationException invalidCredentials() {
        return new AuthenticationException("Invalid username or password");
    }

    /**
     * Creates an AuthenticationException for disabled account.
     * 
     * @return AuthenticationException instance
     */
    public static AuthenticationException accountDisabled() {
        return new AuthenticationException("Account is disabled");
    }

    /**
     * Creates an AuthenticationException for locked account.
     * 
     * @return AuthenticationException instance
     */
    public static AuthenticationException accountLocked() {
        return new AuthenticationException("Account is locked");
    }

    /**
     * Creates an AuthenticationException for expired account.
     * 
     * @return AuthenticationException instance
     */
    public static AuthenticationException accountExpired() {
        return new AuthenticationException("Account has expired");
    }

    /**
     * Creates an AuthenticationException for token-related issues.
     * 
     * @param message the specific token error message
     * @return AuthenticationException instance
     */
    public static AuthenticationException tokenError(String message) {
        return new AuthenticationException("Token error: " + message);
    }
}
