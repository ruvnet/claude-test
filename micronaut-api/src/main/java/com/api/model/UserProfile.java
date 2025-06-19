package com.api.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import io.micronaut.core.annotation.Introspected;
// Using jakarta.persistence.GeneratedValue instead of micronaut data annotation
// Using jakarta.persistence.Id instead of micronaut data annotation
import io.micronaut.data.annotation.MappedEntity;
import io.micronaut.data.annotation.Relation;

import jakarta.persistence.*;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * UserProfile entity for extended user information.
 * 
 * This entity stores additional user profile details that are
 * not essential for authentication but useful for user management.
 * 
 * @author Implementation Developer
 */
@Entity
@Table(name = "user_profiles")
@MappedEntity
@Introspected
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true, nullable = false)
    @Relation(value = Relation.Kind.ONE_TO_ONE)
    @JsonIgnore
    private User user;

    @Column(name = "phone_number", length = 20)
    @Pattern(regexp = "^[+]?[0-9\\s\\-()]{7,20}$", message = "Phone number format is invalid")
    private String phoneNumber;

    @Column(name = "date_of_birth")
    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(length = 100)
    @Size(max = 100, message = "Address cannot exceed 100 characters")
    private String address;

    @Column(length = 50)
    @Size(max = 50, message = "City cannot exceed 50 characters")
    private String city;

    @Column(length = 50)
    @Size(max = 50, message = "State cannot exceed 50 characters")
    private String state;

    @Column(name = "postal_code", length = 20)
    @Size(max = 20, message = "Postal code cannot exceed 20 characters")
    private String postalCode;

    @Column(length = 50)
    @Size(max = 50, message = "Country cannot exceed 50 characters")
    private String country;

    @Column(name = "profile_picture_url", length = 500)
    @Size(max = 500, message = "Profile picture URL cannot exceed 500 characters")
    private String profilePictureUrl;

    @Column(length = 500)
    @Size(max = 500, message = "Bio cannot exceed 500 characters")
    private String bio;

    @Column(name = "website_url", length = 200)
    @Size(max = 200, message = "Website URL cannot exceed 200 characters")
    private String websiteUrl;

    @Column(length = 100)
    @Size(max = 100, message = "Occupation cannot exceed 100 characters")
    private String occupation;

    @Column(length = 100)
    @Size(max = 100, message = "Company cannot exceed 100 characters")
    private String company;

    @Column(name = "timezone", length = 50)
    @Size(max = 50, message = "Timezone cannot exceed 50 characters")
    private String timezone;

    @Column(length = 10)
    @Size(max = 10, message = "Language cannot exceed 10 characters")
    private String language = "en";

    @Column(name = "newsletter_subscribed", nullable = false)
    private Boolean newsletterSubscribed = false;

    @Column(name = "profile_visibility")
    @Enumerated(EnumType.STRING)
    private ProfileVisibility profileVisibility = ProfileVisibility.PRIVATE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // Enums
    public enum Gender {
        MALE, FEMALE, OTHER, PREFER_NOT_TO_SAY
    }

    public enum ProfileVisibility {
        PUBLIC, PRIVATE, FRIENDS_ONLY
    }

    // Default constructor
    public UserProfile() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    // Constructor with user
    public UserProfile(User user) {
        this();
        this.user = user;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getPostalCode() {
        return postalCode;
    }

    public void setPostalCode(String postalCode) {
        this.postalCode = postalCode;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String country) {
        this.country = country;
    }

    public String getProfilePictureUrl() {
        return profilePictureUrl;
    }

    public void setProfilePictureUrl(String profilePictureUrl) {
        this.profilePictureUrl = profilePictureUrl;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getWebsiteUrl() {
        return websiteUrl;
    }

    public void setWebsiteUrl(String websiteUrl) {
        this.websiteUrl = websiteUrl;
    }

    public String getOccupation() {
        return occupation;
    }

    public void setOccupation(String occupation) {
        this.occupation = occupation;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getTimezone() {
        return timezone;
    }

    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public Boolean getNewsletterSubscribed() {
        return newsletterSubscribed;
    }

    public void setNewsletterSubscribed(Boolean newsletterSubscribed) {
        this.newsletterSubscribed = newsletterSubscribed;
    }

    public ProfileVisibility getProfileVisibility() {
        return profileVisibility;
    }

    public void setProfileVisibility(ProfileVisibility profileVisibility) {
        this.profileVisibility = profileVisibility;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    // Utility methods
    public String getFullAddress() {
        StringBuilder fullAddress = new StringBuilder();
        if (address != null) fullAddress.append(address);
        if (city != null) {
            if (fullAddress.length() > 0) fullAddress.append(", ");
            fullAddress.append(city);
        }
        if (state != null) {
            if (fullAddress.length() > 0) fullAddress.append(", ");
            fullAddress.append(state);
        }
        if (postalCode != null) {
            if (fullAddress.length() > 0) fullAddress.append(" ");
            fullAddress.append(postalCode);
        }
        if (country != null) {
            if (fullAddress.length() > 0) fullAddress.append(", ");
            fullAddress.append(country);
        }
        return fullAddress.toString();
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof UserProfile)) return false;
        UserProfile that = (UserProfile) o;
        return id != null && id.equals(that.getId());
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    @Override
    public String toString() {
        return "UserProfile{" +
                "id=" + id +
                ", phoneNumber='" + phoneNumber + '\'' +
                ", city='" + city + '\'' +
                ", country='" + country + '\'' +
                ", profileVisibility=" + profileVisibility +
                ", createdAt=" + createdAt +
                '}';
    }
}
