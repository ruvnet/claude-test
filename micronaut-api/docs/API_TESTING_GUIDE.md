# API Testing Guide

## Overview
This document provides comprehensive guidance for testing the Micronaut Authentication API. It covers testing approaches, tools, and best practices for ensuring the API functions correctly and securely.

## Table of Contents
1. [API Endpoints](#api-endpoints)
2. [Authentication Flow](#authentication-flow)
3. [Testing Strategy](#testing-strategy)
4. [Sample Requests and Responses](#sample-requests-and-responses)
5. [Security Testing](#security-testing)
6. [Performance Testing](#performance-testing)
7. [Automated Testing](#automated-testing)
8. [Tools and Configuration](#tools-and-configuration)

## API Endpoints

### Public Endpoints (No Authentication Required)

#### Health Check
- **Endpoint**: `GET /api/public/health`
- **Description**: Returns application health status
- **Authentication**: None required
- **Response**: JSON with status and timestamp

#### Application Info
- **Endpoint**: `GET /api/public/info`
- **Description**: Returns application information
- **Authentication**: None required
- **Response**: JSON with application details

### Authentication Endpoints

#### User Registration
- **Endpoint**: `POST /api/auth/register`
- **Description**: Register a new user account
- **Authentication**: None required
- **Request Body**: RegisterRequest JSON
- **Response**: AuthResponse with access token

#### User Login
- **Endpoint**: `POST /api/auth/login`
- **Description**: Authenticate existing user
- **Authentication**: None required
- **Request Body**: LoginRequest JSON
- **Response**: AuthResponse with access token

#### Token Refresh
- **Endpoint**: `POST /api/auth/refresh`
- **Description**: Refresh access token using refresh token
- **Authentication**: None required
- **Request Body**: TokenRefreshRequest JSON
- **Response**: AuthResponse with new tokens
- **Note**: Currently returns 401 (Not Implemented)

### Protected Endpoints (Authentication Required)

#### Get User Profile
- **Endpoint**: `GET /api/users/profile`
- **Description**: Get current user's profile information
- **Authentication**: Bearer token required
- **Response**: User JSON (password field removed)

## Authentication Flow

### Standard Registration → Login Flow
1. **Register New User**
   ```
   POST /api/auth/register
   {
     "username": "newuser",
     "email": "user@example.com",
     "password": "securepassword123"
   }
   ```

2. **Login with Credentials**
   ```
   POST /api/auth/login
   {
     "username": "newuser",
     "password": "securepassword123"
   }
   ```

3. **Access Protected Resources**
   ```
   GET /api/users/profile
   Authorization: Bearer <access_token>
   ```

### Token Usage
- Include Bearer token in Authorization header: `Authorization: Bearer <token>`
- Tokens are valid for 1 hour (3600 seconds)
- Use refresh token to obtain new access tokens (when implemented)

## Testing Strategy

### Unit Testing
- **Service Layer**: Test business logic in isolation
- **Model Validation**: Test entity constraints and validation
- **Mock Dependencies**: Use Mockito for repository and external service mocking
- **Coverage Target**: >90% code coverage

### Integration Testing
- **Controller Testing**: Test API endpoints with real HTTP requests
- **Database Integration**: Test with embedded H2 database
- **Security Integration**: Test authentication and authorization
- **Error Handling**: Test error responses and status codes

### Security Testing
- **Authentication Tests**: Verify token validation
- **Authorization Tests**: Ensure proper access control
- **Input Validation**: Test with malicious and invalid inputs
- **Token Security**: Test token manipulation and forgery attempts

### Flow Testing
- **Complete User Journeys**: Registration → Login → Profile Access
- **Error Recovery**: Failed login → Successful retry
- **Concurrent Access**: Multiple sessions with same user
- **Session Management**: Token expiration and refresh

## Sample Requests and Responses

### Successful Registration
**Request:**
```http
POST /api/auth/register HTTP/1.1
Content-Type: application/json

{
  "username": "johnsmith",
  "email": "john.smith@example.com",
  "password": "mySecurePassword123"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..._refresh",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "username": "johnsmith",
  "email": "john.smith@example.com"
}
```

### Successful Login
**Request:**
```http
POST /api/auth/login HTTP/1.1
Content-Type: application/json

{
  "username": "johnsmith",
  "password": "mySecurePassword123"
}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..._refresh",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "username": "johnsmith",
  "email": "john.smith@example.com"
}
```

### Get User Profile
**Request:**
```http
GET /api/users/profile HTTP/1.1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 1,
  "username": "johnsmith",
  "email": "john.smith@example.com",
  "password": null,
  "enabled": true,
  "accountNonExpired": true,
  "accountNonLocked": true,
  "credentialsNonExpired": true,
  "createdAt": "2024-01-15T10:30:00",
  "lastLoginAt": "2024-01-15T11:45:30",
  "roles": ["USER"]
}
```

### Error Responses

#### Registration with Duplicate Username
**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": "Username already exists",
  "path": "/api/auth/register",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

#### Invalid Login Credentials
**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "message": "Invalid username or password",
  "path": "/api/auth/login",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

#### Unauthorized Access
**Response:**
```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "message": "Unauthorized",
  "path": "/api/users/profile",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

#### Validation Errors
**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "message": "Validation failed",
  "violations": [
    {
      "field": "email",
      "message": "Email must be valid"
    },
    {
      "field": "password",
      "message": "Password must be at least 6 characters"
    }
  ],
  "path": "/api/auth/register",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Security Testing

### Token Security Tests
1. **Invalid Token Format**: Test with malformed JWT tokens
2. **Expired Tokens**: Test with tokens that have expired
3. **Signature Validation**: Test with tokens having invalid signatures
4. **Token Injection**: Test with SQL injection and XSS attempts in tokens
5. **Authorization Header**: Test various authorization header formats

### Input Validation Tests
1. **Username Validation**: Test min/max length, special characters
2. **Email Validation**: Test invalid email formats
3. **Password Strength**: Test minimum requirements
4. **SQL Injection**: Test with malicious SQL in inputs
5. **XSS Attacks**: Test with script injection attempts

### Rate Limiting Tests
1. **Rapid Requests**: Test system stability under load
2. **Invalid Token Flood**: Test with many invalid authentication attempts
3. **Registration Spam**: Test multiple registrations from same source

## Performance Testing

### Load Testing Scenarios
1. **Registration Load**: Concurrent user registrations
2. **Login Load**: Concurrent user logins
3. **Token Validation Load**: Many requests to protected endpoints
4. **Mixed Workload**: Combination of all operations

### Performance Metrics
- **Response Time**: < 200ms for auth operations
- **Throughput**: > 1000 requests/second
- **Error Rate**: < 0.1% under normal load
- **Resource Usage**: Memory and CPU within limits

## Automated Testing

### Test Execution
```bash
# Run all tests
mvn test

# Run specific test categories
mvn test -Dtest="*Test"
mvn test -Dtest="*SecurityTest"
mvn test -Dtest="*FlowTest"

# Run with coverage
mvn test jacoco:report
```

### Test Configuration
- **Test Database**: H2 in-memory database
- **Test Server**: Random port assignment
- **Test Data**: Isolated test data for each test
- **Cleanup**: Automatic database cleanup between tests

### Continuous Integration
```yaml
# Example CI configuration
steps:
  - name: Run Unit Tests
    run: mvn test -Dtest="*Test" -Dspring.profiles.active=test
  
  - name: Run Integration Tests
    run: mvn test -Dtest="*IT" -Dspring.profiles.active=test
  
  - name: Run Security Tests
    run: mvn test -Dtest="*SecurityTest" -Dspring.profiles.active=test
  
  - name: Generate Coverage Report
    run: mvn jacoco:report
  
  - name: Upload Coverage
    uses: codecov/codecov-action@v1
```

## Tools and Configuration

### Testing Framework Stack
- **JUnit 5**: Primary testing framework
- **Mockito**: Mocking framework for unit tests
- **Micronaut Test**: Integration testing support
- **RestAssured**: HTTP client for API testing
- **Testcontainers**: Container-based testing (if needed)

### Development Tools
- **Postman**: Manual API testing and documentation
- **Insomnia**: Alternative REST client
- **Newman**: Command-line Postman collection runner
- **JMeter**: Performance and load testing

### Test Data Management
- **TestDataBuilder**: Builder pattern for test objects
- **Test Fixtures**: Reusable test data sets
- **Database Seeding**: Programmatic test data creation
- **Data Cleanup**: Automatic cleanup between tests

### Monitoring and Reporting
- **JaCoCo**: Code coverage reporting
- **SonarQube**: Code quality analysis
- **Test Reports**: HTML test result reports
- **Performance Metrics**: Response time and throughput tracking

## Best Practices

### Test Organization
- **Nested Test Classes**: Group related tests together
- **Descriptive Names**: Use clear, descriptive test method names
- **Test Categories**: Organize tests by type (unit, integration, security)
- **Test Order**: Use `@Order` for integration tests when needed

### Test Data
- **Isolation**: Each test should be independent
- **Cleanup**: Clean up test data after each test
- **Realistic Data**: Use realistic test data scenarios
- **Edge Cases**: Test boundary conditions and edge cases

### Assertions
- **Specific Assertions**: Use specific assertion methods
- **Multiple Assertions**: Group related assertions together
- **Error Messages**: Provide meaningful assertion messages
- **Exception Testing**: Test both success and failure scenarios

### Maintenance
- **Regular Updates**: Keep tests updated with API changes
- **Refactoring**: Refactor tests along with production code
- **Documentation**: Keep test documentation current
- **Review**: Regular test code reviews

## Troubleshooting

### Common Issues
1. **Token Expiration**: Ensure tokens are fresh for testing
2. **Database State**: Check for test data pollution
3. **Port Conflicts**: Use random ports for test servers
4. **Timing Issues**: Add appropriate waits for async operations

### Debug Configuration
```yaml
# application-test.yml
logging:
  level:
    com.example: DEBUG
    io.micronaut.security: DEBUG
    org.hibernate.SQL: DEBUG
```

### Test Environment Variables
```bash
export JWT_GENERATOR_SIGNATURE_SECRET="test-secret-key"
export MICRONAUT_ENVIRONMENTS="test"
export DATABASE_URL="jdbc:h2:mem:testdb"
```