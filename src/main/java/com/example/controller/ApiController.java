package com.example.controller;

import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.security.annotation.Secured;
import io.micronaut.security.authentication.Authentication;
import io.micronaut.security.rules.SecurityRule;
import java.time.LocalDateTime;
import java.util.Map;

@Controller("/api")
public class ApiController {
    
    /**
     * Public endpoint - no authentication required
     */
    @Get("/public/hello")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> publicHello() {
        return HttpResponse.ok(Map.of(
                "message", "Hello from public endpoint!",
                "timestamp", LocalDateTime.now(),
                "authenticated", false
        ));
    }
    
    /**
     * Protected endpoint - authentication required
     */
    @Get("/protected/hello")
    @Secured(SecurityRule.IS_AUTHENTICATED)
    public HttpResponse<?> protectedHello(Authentication authentication) {
        return HttpResponse.ok(Map.of(
                "message", "Hello " + authentication.getName() + "!",
                "timestamp", LocalDateTime.now(),
                "authenticated", true,
                "username", authentication.getName(),
                "roles", authentication.getRoles()
        ));
    }
    
    /**
     * Admin only endpoint - requires ADMIN role
     */
    @Get("/admin/users")
    @Secured("ROLE_ADMIN")
    public HttpResponse<?> adminOnly(Authentication authentication) {
        return HttpResponse.ok(Map.of(
                "message", "Welcome to admin area, " + authentication.getName() + "!",
                "timestamp", LocalDateTime.now(),
                "endpoint", "admin-only",
                "user", authentication.getName(),
                "roles", authentication.getRoles()
        ));
    }
    
    /**
     * User or Admin endpoint - requires USER or ADMIN role
     */
    @Get("/user/dashboard")
    @Secured({"ROLE_USER", "ROLE_ADMIN"})
    public HttpResponse<?> userDashboard(Authentication authentication) {
        return HttpResponse.ok(Map.of(
                "message", "Welcome to your dashboard, " + authentication.getName() + "!",
                "timestamp", LocalDateTime.now(),
                "endpoint", "user-dashboard",
                "user", authentication.getName(),
                "roles", authentication.getRoles()
        ));
    }
    
    /**
     * Health check endpoint
     */
    @Get("/health")
    @Secured(SecurityRule.IS_ANONYMOUS)
    public HttpResponse<?> health() {
        return HttpResponse.ok(Map.of(
                "status", "UP",
                "timestamp", LocalDateTime.now(),
                "service", "Secure Micronaut API"
        ));
    }
}