package com.example.security;

import com.example.model.Role;
import com.example.model.User;
import com.example.repository.UserRepository;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.http.HttpRequest;
import io.micronaut.security.authentication.*;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import org.mindrot.jbcrypt.BCrypt;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Flux;
import reactor.core.publisher.FluxSink;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Singleton
public class AuthenticationProviderUserPassword implements AuthenticationProvider<HttpRequest<?>> {
    
    private final UserRepository userRepository;
    
    @Inject
    public AuthenticationProviderUserPassword(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    @Override
    public Publisher<AuthenticationResponse> authenticate(
            @Nullable HttpRequest<?> httpRequest,
            AuthenticationRequest<?, ?> authenticationRequest) {
        
        return Flux.create(emitter -> {
            String identity = authenticationRequest.getIdentity().toString();
            String secret = authenticationRequest.getSecret().toString();
            
            Optional<User> userOpt = userRepository.findByUsername(identity);
            if (userOpt.isEmpty()) {
                userOpt = userRepository.findByEmail(identity);
            }
            
            if (userOpt.isPresent()) {
                User user = userOpt.get();
                
                // Check if account is enabled and not locked
                if (!user.isEnabled()) {
                    emitter.error(new AuthenticationException("Account is disabled"));
                    return;
                }
                
                if (!user.isAccountNonLocked()) {
                    emitter.error(new AuthenticationException("Account is locked"));
                    return;
                }
                
                if (!user.isAccountNonExpired()) {
                    emitter.error(new AuthenticationException("Account is expired"));
                    return;
                }
                
                if (!user.isCredentialsNonExpired()) {
                    emitter.error(new AuthenticationException("Credentials are expired"));
                    return;
                }
                
                // Verify password using BCrypt
                if (BCrypt.checkpw(secret, user.getPassword())) {
                    // Update last login time
                    user.setLastLogin(LocalDateTime.now());
                    userRepository.save(user);
                    
                    // Convert roles to string list
                    List<String> roles = user.getRoles().stream()
                            .map(Role::getAuthority)
                            .collect(Collectors.toList());
                    
                    // Create successful authentication response
                    AuthenticationResponse successResponse = AuthenticationResponse.success(
                            user.getUsername(),
                            roles
                    );
                    
                    emitter.next(successResponse);
                    emitter.complete();
                } else {
                    emitter.error(new AuthenticationException("Invalid credentials"));
                }
            } else {
                emitter.error(new AuthenticationException("User not found"));
            }
        }, FluxSink.OverflowStrategy.ERROR);
    }
    
    /**
     * Hash password using BCrypt
     */
    public static String hashPassword(String plainTextPassword) {
        return BCrypt.hashpw(plainTextPassword, BCrypt.gensalt(12));
    }
    
    /**
     * Verify password against hash
     */
    public static boolean verifyPassword(String plainTextPassword, String hashedPassword) {
        return BCrypt.checkpw(plainTextPassword, hashedPassword);
    }
}