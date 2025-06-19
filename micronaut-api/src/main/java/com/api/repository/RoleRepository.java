package com.api.repository;

import com.api.model.Role;
import io.micronaut.data.annotation.Repository;
import io.micronaut.data.jpa.repository.JpaRepository;
import io.micronaut.data.model.Page;
import io.micronaut.data.model.Pageable;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Role entity operations.
 * 
 * This interface extends JpaRepository to provide CRUD operations
 * and custom query methods for Role entities.
 * 
 * @author Implementation Developer
 */
@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {

    /**
     * Find role by name.
     * 
     * @param name the role name to search for
     * @return Optional containing the role if found
     */
    Optional<Role> findByName(String name);

    /**
     * Check if a role name already exists.
     * 
     * @param name the role name to check
     * @return true if role name exists, false otherwise
     */
    boolean existsByName(String name);

    /**
     * Find all active roles.
     * 
     * @return List of active roles
     */
    List<Role> findByActiveTrue();

    /**
     * Find all inactive roles.
     * 
     * @return List of inactive roles
     */
    List<Role> findByActiveFalse();

    /**
     * Find active roles with pagination.
     * 
     * @param pageable pagination information
     * @return Page of active roles
     */
    Page<Role> findByActiveTrue(Pageable pageable);

    /**
     * Find roles by name containing the search term (case-insensitive).
     * 
     * @param name the name search term
     * @param pageable pagination information
     * @return Page of matching roles
     */
    Page<Role> findByNameContainingIgnoreCase(String name, Pageable pageable);

    /**
     * Find roles by description containing the search term (case-insensitive).
     * 
     * @param description the description search term
     * @param pageable pagination information
     * @return Page of matching roles
     */
    Page<Role> findByDescriptionContainingIgnoreCase(String description, Pageable pageable);

    /**
     * Find all roles ordered by name.
     * 
     * @return List of roles ordered by name
     */
    List<Role> findAllOrderByNameAsc();

    /**
     * Find all roles ordered by creation date (newest first).
     * 
     * @param pageable pagination information
     * @return Page of roles ordered by creation date
     */
    Page<Role> findAllOrderByCreatedAtDesc(Pageable pageable);

    /**
     * Count total number of roles.
     * 
     * @return total role count
     */
    long count();

    /**
     * Count active roles.
     * 
     * @return count of active roles
     */
    long countByActiveTrue();

    /**
     * Count roles that have users assigned.
     * 
     * @return count of roles with users
     */
    long countByUsersIsNotEmpty();

    /**
     * Find roles that have no users assigned.
     * 
     * @param pageable pagination information
     * @return Page of roles without users
     */
    Page<Role> findByUsersIsEmpty(Pageable pageable);

    /**
     * Find roles that have users assigned.
     * 
     * @param pageable pagination information
     * @return Page of roles with users
     */
    Page<Role> findByUsersIsNotEmpty(Pageable pageable);
}
