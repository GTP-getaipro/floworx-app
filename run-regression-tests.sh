#!/bin/bash

# FloWorx Regression Testing Script for Linux/Mac
# Executes comprehensive regression testing using existing Jest framework

set -e  # Exit on any error

echo "========================================"
echo "FloWorx Comprehensive Regression Testing"
echo "========================================"
echo ""

# Check if we're in the correct directory
if [ ! -f "backend/package.json" ]; then
    echo "Error: Please run this script from the FloWorx project root directory"
    echo "Expected to find backend/package.json"
    exit 1
fi

# Set environment variables
export NODE_ENV=test
export JWT_SECRET=test-jwt-secret-for-regression-testing-32-chars
export ENCRYPTION_KEY=test-encryption-key-32-chars-long

echo "Setting up test environment..."
echo "NODE_ENV=$NODE_ENV"
echo ""

# Change to backend directory
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies"
        exit 1
    fi
    echo ""
fi

# Parse command line arguments
VERBOSE=false
COVERAGE=false
SUITE=all

show_help() {
    echo ""
    echo "FloWorx Regression Testing Script"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  --verbose     Enable verbose output"
    echo "  --coverage    Generate coverage report after tests"
    echo "  --suite NAME  Run specific test suite (default: all)"
    echo "  --help        Show this help message"
    echo ""
    echo "Available test suites:"
    echo "  all           Run complete regression test suite (default)"
    echo "  unit          Run unit tests only"
    echo "  integration   Run integration tests only"
    echo "  auth          Run authentication regression tests"
    echo "  monitoring    Run monitoring system regression tests"
    echo "  performance   Run performance tests only"
    echo "  security      Run security tests only"
    echo ""
    echo "Examples:"
    echo "  $0                           # Run all tests"
    echo "  $0 --verbose                 # Run all tests with verbose output"
    echo "  $0 --suite unit --coverage   # Run unit tests with coverage"
    echo "  $0 --suite auth              # Run authentication tests only"
    echo ""
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose)
            VERBOSE=true
            shift
            ;;
        --coverage)
            COVERAGE=true
            shift
            ;;
        --suite)
            SUITE="$2"
            shift 2
            ;;
        --help)
            show_help
            ;;
        *)
            echo "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

echo "Starting regression tests..."
echo "Verbose mode: $VERBOSE"
echo "Coverage: $COVERAGE"
echo "Test suite: $SUITE"
echo ""

# Function to handle test failure
test_failed() {
    echo ""
    echo "❌ Regression tests failed!"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Check the error messages above"
    echo "2. Review test logs in test-results/ directory"
    echo "3. Fix failing tests before proceeding"
    echo "4. Re-run tests after fixes"
    echo ""
    echo "For help, run: $0 --help"
    
    # Return to original directory
    cd ..
    exit 1
}

# Execute tests based on suite selection
case $SUITE in
    all)
        echo "Running full regression test suite..."
        if [ "$VERBOSE" = true ]; then
            node ../scripts/run-full-regression.js --verbose
        else
            node ../scripts/run-full-regression.js
        fi
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Full regression tests failed"
            test_failed
        fi
        ;;
    unit)
        echo "Running unit tests..."
        if [ "$VERBOSE" = true ]; then
            npm run test:unit -- --verbose
        else
            npm run test:unit
        fi
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Unit tests failed"
            test_failed
        fi
        ;;
    integration)
        echo "Running integration tests..."
        if [ "$VERBOSE" = true ]; then
            npm run test:integration -- --verbose
        else
            npm run test:integration
        fi
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Integration tests failed"
            test_failed
        fi
        ;;
    auth)
        echo "Running authentication regression tests..."
        if [ "$VERBOSE" = true ]; then
            npm run test:auth-regression
        else
            npm run test:auth-regression
        fi
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Authentication regression tests failed"
            test_failed
        fi
        ;;
    monitoring)
        echo "Running monitoring regression tests..."
        if [ "$VERBOSE" = true ]; then
            npm run test:monitoring-regression
        else
            npm run test:monitoring-regression
        fi
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Monitoring regression tests failed"
            test_failed
        fi
        ;;
    performance)
        echo "Running performance tests..."
        if [ "$VERBOSE" = true ]; then
            npm run test:performance -- --verbose
        else
            npm run test:performance
        fi
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Performance tests failed"
            test_failed
        fi
        ;;
    security)
        echo "Running security tests..."
        if [ "$VERBOSE" = true ]; then
            npx jest tests/security --verbose
        else
            npx jest tests/security
        fi
        if [ $? -ne 0 ]; then
            echo ""
            echo "❌ Security tests failed"
            test_failed
        fi
        ;;
    *)
        echo "Error: Unknown test suite '$SUITE'"
        echo "Available suites: all, unit, integration, auth, monitoring, performance, security"
        test_failed
        ;;
esac

# Run coverage if requested
if [ "$COVERAGE" = true ]; then
    echo ""
    echo "Generating coverage report..."
    npm run test:coverage
    if [ $? -ne 0 ]; then
        echo "Warning: Coverage report generation failed"
    else
        echo "Coverage report generated in coverage/lcov-report/index.html"
    fi
fi

echo ""
echo "✅ Regression tests completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review test results in test-results/ directory"
echo "2. Check coverage report if generated"
echo "3. Address any recommendations in the test report"
echo "4. Proceed with deployment if all tests passed"

# Return to original directory
cd ..

echo ""
echo "Regression testing completed at $(date)"
exit 0
