#!/bin/bash

# Micronaut Auth API Test Runner
# This script runs the complete test suite and generates reports

set -e

echo "🚀 Starting Micronaut Auth API Test Suite"
echo "==========================================="

# Check if Maven is available
if ! command -v mvn &> /dev/null; then
    echo "❌ Maven is not installed or not in PATH"
    exit 1
fi

# Clean previous build artifacts
echo "🧹 Cleaning previous build artifacts..."
mvn clean -q

# Compile the project
echo "🔨 Compiling project..."
mvn compile -q

# Compile test sources
echo "🔨 Compiling test sources..."
mvn test-compile -q

# Run unit tests
echo "🧪 Running unit tests..."
mvn test -Dtest="*Test" -q
unit_exit_code=$?

if [ $unit_exit_code -eq 0 ]; then
    echo "✅ Unit tests passed"
else
    echo "❌ Unit tests failed"
fi

# Run integration tests
echo "🔗 Running integration tests..."
mvn test -Dtest="*ControllerTest" -q
integration_exit_code=$?

if [ $integration_exit_code -eq 0 ]; then
    echo "✅ Integration tests passed"
else
    echo "❌ Integration tests failed"
fi

# Run authentication flow tests
echo "🔐 Running authentication flow tests..."
mvn test -Dtest="*FlowTest" -q
flow_exit_code=$?

if [ $flow_exit_code -eq 0 ]; then
    echo "✅ Authentication flow tests passed"
else
    echo "❌ Authentication flow tests failed"
fi

# Run security tests
echo "🛡️ Running security tests..."
mvn test -Dtest="*SecurityTest" -q
security_exit_code=$?

if [ $security_exit_code -eq 0 ]; then
    echo "✅ Security tests passed"
else
    echo "❌ Security tests failed"
fi

# Generate coverage report
echo "📊 Generating test coverage report..."
mvn jacoco:report -q
coverage_exit_code=$?

if [ $coverage_exit_code -eq 0 ]; then
    echo "✅ Coverage report generated"
else
    echo "❌ Failed to generate coverage report"
fi

# Summary
echo ""
echo "📋 Test Summary"
echo "==============="

total_failed=0

if [ $unit_exit_code -eq 0 ]; then
    echo "✅ Unit Tests: PASSED"
else
    echo "❌ Unit Tests: FAILED"
    total_failed=$((total_failed + 1))
fi

if [ $integration_exit_code -eq 0 ]; then
    echo "✅ Integration Tests: PASSED"
else
    echo "❌ Integration Tests: FAILED"
    total_failed=$((total_failed + 1))
fi

if [ $flow_exit_code -eq 0 ]; then
    echo "✅ Authentication Flow Tests: PASSED"
else
    echo "❌ Authentication Flow Tests: FAILED"
    total_failed=$((total_failed + 1))
fi

if [ $security_exit_code -eq 0 ]; then
    echo "✅ Security Tests: PASSED"
else
    echo "❌ Security Tests: FAILED"
    total_failed=$((total_failed + 1))
fi

echo ""
if [ $total_failed -eq 0 ]; then
    echo "🎉 ALL TESTS PASSED! 🎉"
    echo "Your Micronaut Auth API is working correctly."
else
    echo "⚠️  $total_failed test suite(s) failed."
    echo "Please check the test output for details."
fi

echo ""
echo "📁 Generated Reports:"
echo "- Coverage Report: target/site/jacoco/index.html"
echo "- Test Reports: target/surefire-reports/"
echo ""
echo "🔧 Tools for further testing:"
echo "- Postman Collection: docs/Micronaut_Auth_API.postman_collection.json"
echo "- API Testing Guide: docs/API_TESTING_GUIDE.md"

# Exit with failure if any tests failed
if [ $total_failed -gt 0 ]; then
    exit 1
fi

echo "✨ Test suite completed successfully!"
exit 0