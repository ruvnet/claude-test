package com.api.exception;

import io.micronaut.context.annotation.Requires;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.annotation.Produces;
import io.micronaut.http.server.exceptions.ExceptionHandler;
import io.micronaut.validation.exceptions.ConstraintExceptionHandler;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Global exception handler for the API.
 * 
 * This class handles various types of exceptions and converts them
 * into appropriate HTTP responses with consistent error structure.
 * 
 * @author Implementation Developer
 */
@Produces
@Singleton
@Requires(classes = {ExceptionHandler.class})
public class GlobalExceptionHandler {

    private static final Logger LOG = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Handle UserNotFoundException.
     */
    @jakarta.inject.Singleton
    public static class UserNotFoundExceptionHandler implements ExceptionHandler<UserNotFoundException, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, UserNotFoundException exception) {
            LOG.warn("User not found: {}", exception.getMessage());
            return HttpResponse.notFound(createErrorResponse(
                "USER_NOT_FOUND",
                exception.getMessage(),
                HttpStatus.NOT_FOUND.getCode(),
                request.getPath()
            ));
        }
    }

    /**
     * Handle UserAlreadyExistsException.
     */
    @jakarta.inject.Singleton
    public static class UserAlreadyExistsExceptionHandler implements ExceptionHandler<UserAlreadyExistsException, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, UserAlreadyExistsException exception) {
            LOG.warn("User already exists: {}", exception.getMessage());
            return HttpResponse.badRequest(createErrorResponse(
                "USER_ALREADY_EXISTS",
                exception.getMessage(),
                HttpStatus.BAD_REQUEST.getCode(),
                request.getPath()
            ));
        }
    }

    /**
     * Handle AuthenticationException.
     */
    @jakarta.inject.Singleton
    public static class AuthenticationExceptionHandler implements ExceptionHandler<AuthenticationException, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, AuthenticationException exception) {
            LOG.warn("Authentication failed: {}", exception.getMessage());
            return HttpResponse.unauthorized().body(createErrorResponse(
                "AUTHENTICATION_FAILED",
                exception.getMessage(),
                HttpStatus.UNAUTHORIZED.getCode(),
                request.getPath()
            ));
        }
    }

    /**
     * Handle validation errors (ConstraintViolationException).
     */
    @jakarta.inject.Singleton
    public static class ValidationExceptionHandler implements ExceptionHandler<ConstraintViolationException, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, ConstraintViolationException exception) {
            LOG.warn("Validation failed: {}", exception.getMessage());
            
            Map<String, String> fieldErrors = exception.getConstraintViolations()
                    .stream()
                    .collect(Collectors.toMap(
                        violation -> getFieldName(violation),
                        ConstraintViolation::getMessage,
                        (existing, replacement) -> existing // Keep first error if multiple for same field
                    ));
            
            Map<String, Object> errorResponse = createErrorResponse(
                "VALIDATION_FAILED",
                "Validation failed for one or more fields",
                HttpStatus.BAD_REQUEST.getCode(),
                request.getPath()
            );
            errorResponse.put("fieldErrors", fieldErrors);
            
            return HttpResponse.badRequest(errorResponse);
        }
        
        private String getFieldName(ConstraintViolation<?> violation) {
            String propertyPath = violation.getPropertyPath().toString();
            // Extract the last part of the property path (field name)
            int lastDotIndex = propertyPath.lastIndexOf('.');
            return lastDotIndex >= 0 ? propertyPath.substring(lastDotIndex + 1) : propertyPath;
        }
    }

    /**
     * Handle IllegalArgumentException.
     */
    @jakarta.inject.Singleton
    public static class IllegalArgumentExceptionHandler implements ExceptionHandler<IllegalArgumentException, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, IllegalArgumentException exception) {
            LOG.warn("Illegal argument: {}", exception.getMessage());
            return HttpResponse.badRequest(createErrorResponse(
                "INVALID_ARGUMENT",
                exception.getMessage(),
                HttpStatus.BAD_REQUEST.getCode(),
                request.getPath()
            ));
        }
    }

    /**
     * Handle IllegalStateException.
     */
    @jakarta.inject.Singleton
    public static class IllegalStateExceptionHandler implements ExceptionHandler<IllegalStateException, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, IllegalStateException exception) {
            LOG.warn("Illegal state: {}", exception.getMessage());
            return HttpResponse.badRequest(createErrorResponse(
                "INVALID_STATE",
                exception.getMessage(),
                HttpStatus.BAD_REQUEST.getCode(),
                request.getPath()
            ));
        }
    }

    /**
     * Handle generic RuntimeException.
     */
    @jakarta.inject.Singleton
    public static class RuntimeExceptionHandler implements ExceptionHandler<RuntimeException, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, RuntimeException exception) {
            LOG.error("Unexpected runtime exception", exception);
            return HttpResponse.serverError(createErrorResponse(
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred. Please try again later.",
                HttpStatus.INTERNAL_SERVER_ERROR.getCode(),
                request.getPath()
            ));
        }
    }

    /**
     * Handle generic Exception.
     */
    @jakarta.inject.Singleton
    public static class GenericExceptionHandler implements ExceptionHandler<Exception, HttpResponse<?>> {
        
        @Override
        public HttpResponse<?> handle(HttpRequest request, Exception exception) {
            LOG.error("Unexpected exception", exception);
            return HttpResponse.serverError(createErrorResponse(
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred. Please try again later.",
                HttpStatus.INTERNAL_SERVER_ERROR.getCode(),
                request.getPath()
            ));
        }
    }

    /**
     * Create a standardized error response.
     * 
     * @param errorCode the error code
     * @param message the error message
     * @param status the HTTP status code
     * @param path the request path
     * @return Map containing error response data
     */
    private static Map<String, Object> createErrorResponse(String errorCode, String message, int status, String path) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("timestamp", LocalDateTime.now());
        errorResponse.put("status", status);
        errorResponse.put("error", errorCode);
        errorResponse.put("message", message);
        errorResponse.put("path", path);
        return errorResponse;
    }
}
