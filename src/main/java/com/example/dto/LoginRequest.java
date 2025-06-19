package com.example.dto;

import io.micronaut.serde.annotation.Serdeable;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Serdeable
public class LoginRequest {
    
    @NotBlank(message = "Username or email is required")
    private String identity;
    
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    
    // Constructors
    public LoginRequest() {}
    
    public LoginRequest(String identity, String password) {
        this.identity = identity;
        this.password = password;
    }
    
    // Getters and Setters
    public String getIdentity() {
        return identity;
    }
    
    public void setIdentity(String identity) {
        this.identity = identity;
    }
    
    public String getPassword() {
        return password;
    }
    
    public void setPassword(String password) {
        this.password = password;
    }
}