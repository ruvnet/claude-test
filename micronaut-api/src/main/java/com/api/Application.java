package com.api;

import io.micronaut.runtime.Micronaut;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;

/**
 * Main application class for the Micronaut REST API.
 * 
 * This class bootstraps the Micronaut application and configures
 * OpenAPI documentation with JWT security scheme.
 * 
 * @author Implementation Developer
 * @version 1.0.0
 */
@OpenAPIDefinition(
    info = @Info(
        title = "Micronaut REST API",
        version = "1.0.0",
        description = "A comprehensive REST API built with Micronaut framework featuring user management, authentication, and CRUD operations.",
        contact = @Contact(
            name = "API Support",
            email = "support@api.com"
        )
    ),
    servers = {
        @Server(url = "http://localhost:8080", description = "Development Server")
    }
)
@SecurityScheme(
    name = "BearerAuth",
    type = SecuritySchemeType.HTTP,
    scheme = "bearer",
    bearerFormat = "JWT",
    description = "JWT token for API authentication. Format: Bearer <token>"
)
public class Application {

    /**
     * Main method to start the Micronaut application.
     * 
     * @param args command line arguments
     */
    public static void main(String[] args) {
        Micronaut.run(Application.class, args);
    }
}
