#!/bin/bash

# FloWorx Deployment Testing Script
# Starts server and runs comprehensive API tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PORT=${PORT:-5001}
NODE_ENV=${NODE_ENV:-development}
SERVER_PID=""

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

# Cleanup function
cleanup() {
    if [ ! -z "$SERVER_PID" ]; then
        log "Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        success "Server stopped"
    fi
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Check if required dependencies are installed
check_dependencies() {
    log "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        error "npm is not installed"
        exit 1
    fi
    
    if [ ! -f "package.json" ]; then
        error "package.json not found. Please run from backend directory."
        exit 1
    fi
    
    success "Dependencies check passed"
}

# Install npm dependencies if needed
install_dependencies() {
    if [ ! -d "node_modules" ]; then
        log "Installing npm dependencies..."
        npm install
        success "Dependencies installed"
    else
        log "Dependencies already installed"
    fi
}

# Start the server
start_server() {
    log "Starting FloWorx server on port $PORT..."
    
    # Check if port is already in use
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
        warning "Port $PORT is already in use. Attempting to kill existing process..."
        lsof -ti:$PORT | xargs kill -9 2>/dev/null || true
        sleep 2
    fi
    
    # Start server in background
    NODE_ENV=$NODE_ENV PORT=$PORT node server.js > server.log 2>&1 &
    SERVER_PID=$!
    
    log "Server started with PID: $SERVER_PID"
    
    # Wait for server to be ready
    log "Waiting for server to be ready..."
    for i in {1..30}; do
        if curl -s http://localhost:$PORT/health >/dev/null 2>&1; then
            success "Server is ready!"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    error "Server failed to start within 30 seconds"
    cat server.log
    exit 1
}

# Run the deployment tests
run_tests() {
    log "Running deployment tests..."
    
    # Install colors package if not present
    if ! npm list colors >/dev/null 2>&1; then
        log "Installing colors package for test output..."
        npm install colors --save-dev
    fi
    
    # Run the test script
    TEST_BASE_URL="http://localhost:$PORT" node scripts/test-deployment.js
}

# Monitor server logs
monitor_logs() {
    log "Monitoring server logs (last 20 lines):"
    echo "----------------------------------------"
    tail -n 20 server.log
    echo "----------------------------------------"
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "🚀 FloWorx Deployment Testing Suite"
    echo "===================================="
    echo -e "${NC}"
    
    check_dependencies
    install_dependencies
    start_server
    
    # Give server a moment to fully initialize
    sleep 3
    
    # Run tests
    if run_tests; then
        success "All deployment tests completed successfully!"
        monitor_logs
        exit 0
    else
        error "Some deployment tests failed!"
        monitor_logs
        exit 1
    fi
}

# Help function
show_help() {
    echo "FloWorx Deployment Testing Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -p, --port PORT     Set server port (default: 5001)"
    echo "  -e, --env ENV       Set NODE_ENV (default: development)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                  # Run with defaults"
    echo "  $0 -p 3000          # Run on port 3000"
    echo "  $0 -e production    # Run in production mode"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -p|--port)
            PORT="$2"
            shift 2
            ;;
        -e|--env)
            NODE_ENV="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main
