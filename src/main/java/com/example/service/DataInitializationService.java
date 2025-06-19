package com.example.service;

import com.example.model.Role;
import com.example.model.User;
import com.example.repository.UserRepository;
import io.micronaut.context.event.ApplicationEventListener;
import io.micronaut.context.event.StartupEvent;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Set;

@Singleton
public class DataInitializationService implements ApplicationEventListener<StartupEvent> {
    
    private static final Logger LOG = LoggerFactory.getLogger(DataInitializationService.class);
    
    private final UserService userService;
    private final UserRepository userRepository;
    
    @Inject
    public DataInitializationService(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }
    
    @Override
    public void onApplicationEvent(StartupEvent event) {
        initializeDefaultUsers();
    }
    
    private void initializeDefaultUsers() {
        LOG.info("Initializing default users...");
        
        try {
            // Create admin user if it doesn't exist
            if (!userRepository.existsByUsername("admin")) {
                User admin = userService.createUser(
                        "admin",
                        "admin@example.com",
                        "admin123",
                        Set.of(Role.ADMIN, Role.USER)
                );
                LOG.info("Created admin user: {}", admin.getUsername());
            }
            
            // Create regular user if it doesn't exist
            if (!userRepository.existsByUsername("user")) {
                User user = userService.createUser(
                        "user",
                        "user@example.com",
                        "user123",
                        Set.of(Role.USER)
                );
                LOG.info("Created regular user: {}", user.getUsername());
            }
            
            // Create moderator user if it doesn't exist
            if (!userRepository.existsByUsername("moderator")) {
                User moderator = userService.createUser(
                        "moderator",
                        "moderator@example.com",
                        "moderator123",
                        Set.of(Role.MODERATOR, Role.USER)
                );
                LOG.info("Created moderator user: {}", moderator.getUsername());
            }
            
            LOG.info("Default users initialization completed.");
            
        } catch (Exception e) {
            LOG.error("Error initializing default users: {}", e.getMessage(), e);
        }
    }
}