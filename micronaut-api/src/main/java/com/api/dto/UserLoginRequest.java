package com.api.dto;

import io.micronaut.core.annotation.Introspected;
import io.micronaut.serde.annotation.Serdeable;

import jakarta.validation.constraints.NotBlank;

/**
 * DTO for user login requests.
 * 
 * This class represents the data structure for user authentication
 * containing credentials required for login.
 * 
 * @author Implementation Developer
 */
@Introspected
@Serdeable
public class UserLoginRequest {

    @NotBlank(message = "Username or email is required")
    private String usernameOrEmail;

    @NotBlank(message = "Password is required")
    private String password;

    private Boolean rememberMe = false;

    // Default constructor
    public UserLoginRequest() {}

    // Constructor with credentials
    public UserLoginRequest(String usernameOrEmail, String password) {
        this.usernameOrEmail = usernameOrEmail;
        this.password = password;
    }

    // Constructor with all fields
    public UserLoginRequest(String usernameOrEmail, String password, Boolean rememberMe) {
        this.usernameOrEmail = usernameOrEmail;
        this.password = password;
        this.rememberMe = rememberMe;
    }

    // Getters and Setters
    public String getUsernameOrEmail() {
        return usernameOrEmail;
    }

    public void setUsernameOrEmail(String usernameOrEmail) {
        this.usernameOrEmail = usernameOrEmail;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Boolean getRememberMe() {
        return rememberMe;
    }

    public void setRememberMe(Boolean rememberMe) {
        this.rememberMe = rememberMe;
    }

    @Override
    public String toString() {
        return "UserLoginRequest{" +
                "usernameOrEmail='" + usernameOrEmail + '\'' +
                ", rememberMe=" + rememberMe +
                '}';
    }
}
