package com.api.dto;

import com.api.model.UserProfile;
import io.micronaut.core.annotation.Introspected;
import io.micronaut.serde.annotation.Serdeable;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/**
 * DTO for user profile update requests.
 * 
 * This class represents the data structure for updating user profile
 * information, including personal details and preferences.
 * 
 * @author Implementation Developer
 */
@Introspected
@Serdeable
public class ProfileUpdateRequest {

    @Size(max = 50, message = "First name cannot exceed 50 characters")
    private String firstName;

    @Size(max = 50, message = "Last name cannot exceed 50 characters")
    private String lastName;

    @Pattern(regexp = "^[+]?[0-9\\s\\-()]{7,20}$", message = "Phone number format is invalid")
    private String phoneNumber;

    @Past(message = "Date of birth must be in the past")
    private LocalDate dateOfBirth;

    private UserProfile.Gender gender;

    @Size(max = 100, message = "Address cannot exceed 100 characters")
    private String address;

    @Size(max = 50, message = "City cannot exceed 50 characters")
    private String city;

    @Size(max = 50, message = "State cannot exceed 50 characters")
    private String state;

    @Size(max = 20, message = "Postal code cannot exceed 20 characters")
    private String postalCode;

    @Size(max = 50, message = "Country cannot exceed 50 characters")
    private String country;

    @Size(max = 500, message = "Profile picture URL cannot exceed 500 characters")
    private String profilePictureUrl;

    @Size(max = 500, message = "Bio cannot exceed 500 characters")
    private String bio;

    @Size(max = 200, message = "Website URL cannot exceed 200 characters")
    private String websiteUrl;

    @Size(max = 100, message = "Occupation cannot exceed 100 characters")
    private String occupation;

    @Size(max = 100, message = "Company cannot exceed 100 characters")
    private String company;

    @Size(max = 50, message = "Timezone cannot exceed 50 characters")
    private String timezone;

    @Size(max = 10, message = "Language cannot exceed 10 characters")
    private String language;

    private Boolean newsletterSubscribed;

    private UserProfile.ProfileVisibility profileVisibility;

    // Default constructor
    public ProfileUpdateRequest() {}

    // Getters and Setters
    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
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

    public UserProfile.Gender getGender() {
        return gender;
    }

    public void setGender(UserProfile.Gender gender) {
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

    public UserProfile.ProfileVisibility getProfileVisibility() {
        return profileVisibility;
    }

    public void setProfileVisibility(UserProfile.ProfileVisibility profileVisibility) {
        this.profileVisibility = profileVisibility;
    }

    @Override
    public String toString() {
        return "ProfileUpdateRequest{" +
                "firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                ", phoneNumber='" + phoneNumber + '\'' +
                ", city='" + city + '\'' +
                ", country='" + country + '\'' +
                ", occupation='" + occupation + '\'' +
                ", profileVisibility=" + profileVisibility +
                '}';
    }
}
