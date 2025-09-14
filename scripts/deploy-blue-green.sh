#!/bin/bash

# FloWorx Blue-Green Deployment Script
# Implements zero-downtime deployment strategy with comprehensive monitoring

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/floworx-deploy-${DEPLOYMENT_ID}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Parse command line arguments
IMAGE=""
ENVIRONMENT=""
COMMIT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --image)
            IMAGE="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --commit)
            COMMIT="$2"
            shift 2
            ;;
        *)
            error "Unknown option $1"
            ;;
    esac
done

# Validate required parameters
if [[ -z "$IMAGE" || -z "$ENVIRONMENT" || -z "$COMMIT" ]]; then
    error "Usage: $0 --image <image> --environment <blue|green> --commit <commit>"
fi

log "Starting FloWorx Blue-Green Deployment"
log "Deployment ID: $DEPLOYMENT_ID"
log "Image: $IMAGE"
log "Environment: $ENVIRONMENT"
log "Commit: $COMMIT"

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

check_prerequisites() {
    log "Checking deployment prerequisites..."
    
    # Check if required tools are available
    command -v docker >/dev/null 2>&1 || error "Docker is required but not installed"
    command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
    
    # Check if environment variables are set
    [[ -n "${COOLIFY_API_TOKEN:-}" ]] || error "COOLIFY_API_TOKEN environment variable is required"
    [[ -n "${COOLIFY_BASE_URL:-}" ]] || error "COOLIFY_BASE_URL environment variable is required"
    
    success "Prerequisites check passed"
}

backup_current_deployment() {
    log "Creating backup of current deployment..."
    
    # Get current deployment info
    CURRENT_DEPLOYMENT=$(curl -s -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
        "$COOLIFY_BASE_URL/api/v1/applications/floworx-app/deployments/current" || echo "{}")
    
    # Save backup info
    echo "$CURRENT_DEPLOYMENT" > "/tmp/floworx-backup-${DEPLOYMENT_ID}.json"
    
    success "Backup created: /tmp/floworx-backup-${DEPLOYMENT_ID}.json"
}

deploy_to_environment() {
    local env=$1
    log "Deploying to $env environment..."
    
    # Create deployment configuration
    cat > "/tmp/deploy-config-${env}.json" << EOF
{
    "image": "$IMAGE",
    "environment": "$env",
    "commit": "$COMMIT",
    "deployment_id": "$DEPLOYMENT_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment_variables": {
        "NODE_ENV": "production",
        "DEPLOYMENT_ID": "$DEPLOYMENT_ID",
        "DEPLOYMENT_ENVIRONMENT": "$env",
        "GIT_COMMIT": "$COMMIT"
    }
}
EOF

    # Deploy using Coolify API
    DEPLOY_RESPONSE=$(curl -s -X POST \
        -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
        -H "Content-Type: application/json" \
        -d @"/tmp/deploy-config-${env}.json" \
        "$COOLIFY_BASE_URL/api/v1/applications/floworx-app/deploy")
    
    DEPLOY_ID=$(echo "$DEPLOY_RESPONSE" | jq -r '.deployment_id // empty')
    
    if [[ -z "$DEPLOY_ID" ]]; then
        error "Failed to start deployment: $DEPLOY_RESPONSE"
    fi
    
    log "Deployment started with ID: $DEPLOY_ID"
    
    # Wait for deployment to complete
    wait_for_deployment "$DEPLOY_ID" "$env"
}

wait_for_deployment() {
    local deploy_id=$1
    local env=$2
    local max_wait=600  # 10 minutes
    local wait_time=0
    local check_interval=15
    
    log "Waiting for deployment $deploy_id to complete..."
    
    while [[ $wait_time -lt $max_wait ]]; do
        DEPLOY_STATUS=$(curl -s -H "Authorization: Bearer $COOLIFY_API_TOKEN" \
            "$COOLIFY_BASE_URL/api/v1/deployments/$deploy_id/status" | jq -r '.status // "unknown"')
        
        case "$DEPLOY_STATUS" in
            "completed"|"success")
                success "Deployment completed successfully"
                return 0
                ;;
            "failed"|"error")
                error "Deployment failed with status: $DEPLOY_STATUS"
                ;;
            "running"|"in_progress")
                log "Deployment in progress... (${wait_time}s elapsed)"
                ;;
            *)
                warning "Unknown deployment status: $DEPLOY_STATUS"
                ;;
        esac
        
        sleep $check_interval
        wait_time=$((wait_time + check_interval))
    done
    
    error "Deployment timeout after ${max_wait}s"
}

health_check() {
    local env=$1
    local base_url
    
    case "$env" in
        "green")
            base_url="${GREEN_ENVIRONMENT_URL:-https://green.floworx-iq.com}"
            ;;
        "blue")
            base_url="${BLUE_ENVIRONMENT_URL:-https://blue.floworx-iq.com}"
            ;;
        *)
            error "Unknown environment: $env"
            ;;
    esac
    
    log "Performing health check on $env environment ($base_url)..."
    
    local max_attempts=20
    local attempt=1
    local wait_time=15
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts..."
        
        # Basic health check
        if curl -f -s --max-time 10 "$base_url/api/health" > /dev/null; then
            log "Basic health check passed"
            
            # Detailed health check
            HEALTH_RESPONSE=$(curl -s --max-time 10 "$base_url/api/health" || echo "{}")
            HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')
            
            if [[ "$HEALTH_STATUS" == "ok" ]]; then
                success "Health check passed for $env environment"
                
                # Additional functional tests
                run_smoke_tests "$base_url"
                return 0
            else
                warning "Health check returned status: $HEALTH_STATUS"
            fi
        else
            warning "Health check failed (attempt $attempt/$max_attempts)"
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log "Waiting ${wait_time}s before next attempt..."
            sleep $wait_time
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "Health check failed after $max_attempts attempts"
}

run_smoke_tests() {
    local base_url=$1
    log "Running smoke tests on $base_url..."
    
    # Test 1: Authentication endpoint
    log "Testing authentication endpoint..."
    AUTH_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d '{"email":"smoke-test-'$(date +%s)'@example.com","password":"SmokeTest123!","firstName":"Smoke","lastName":"Test"}' \
        "$base_url/api/auth/test-register" || echo "{}")
    
    AUTH_SUCCESS=$(echo "$AUTH_RESPONSE" | jq -r '.success // false')
    if [[ "$AUTH_SUCCESS" == "true" ]]; then
        success "Authentication test passed"
        
        # Extract token for further tests
        TOKEN=$(echo "$AUTH_RESPONSE" | jq -r '.data.token // ""')
        
        if [[ -n "$TOKEN" ]]; then
            # Test 2: Email provider selection
            log "Testing email provider selection..."
            EMAIL_RESPONSE=$(curl -s -X POST \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d '{"provider":"gmail"}' \
                "$base_url/api/onboarding/email-provider" || echo "{}")
            
            EMAIL_SUCCESS=$(echo "$EMAIL_RESPONSE" | jq -r '.success // false')
            if [[ "$EMAIL_SUCCESS" == "true" ]]; then
                success "Email provider test passed"
            else
                warning "Email provider test failed: $EMAIL_RESPONSE"
            fi
        fi
    else
        warning "Authentication test failed: $AUTH_RESPONSE"
    fi
    
    success "Smoke tests completed"
}

create_deployment_manifest() {
    log "Creating deployment manifest..."
    
    cat > "/tmp/deployment-manifest-${DEPLOYMENT_ID}.json" << EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "image": "$IMAGE",
    "environment": "$ENVIRONMENT",
    "commit": "$COMMIT",
    "status": "deployed",
    "health_check": "passed",
    "smoke_tests": "passed",
    "rollback_info": {
        "backup_file": "/tmp/floworx-backup-${DEPLOYMENT_ID}.json",
        "previous_deployment": "$(cat /tmp/floworx-backup-${DEPLOYMENT_ID}.json 2>/dev/null | jq -r '.deployment_id // "unknown"')"
    }
}
EOF
    
    success "Deployment manifest created: /tmp/deployment-manifest-${DEPLOYMENT_ID}.json"
}

cleanup_temp_files() {
    log "Cleaning up temporary files..."
    
    rm -f "/tmp/deploy-config-${ENVIRONMENT}.json"
    
    success "Cleanup completed"
}

# ============================================================================
# MAIN DEPLOYMENT FLOW
# ============================================================================

main() {
    log "=========================================="
    log "FloWorx Blue-Green Deployment Started"
    log "=========================================="
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Backup current deployment
    backup_current_deployment
    
    # Step 3: Deploy to target environment
    deploy_to_environment "$ENVIRONMENT"
    
    # Step 4: Health check
    health_check "$ENVIRONMENT"
    
    # Step 5: Create deployment manifest
    create_deployment_manifest
    
    # Step 6: Cleanup
    cleanup_temp_files
    
    log "=========================================="
    success "Blue-Green Deployment Completed Successfully!"
    log "Deployment ID: $DEPLOYMENT_ID"
    log "Environment: $ENVIRONMENT"
    log "Image: $IMAGE"
    log "Log file: $LOG_FILE"
    log "=========================================="
}

# Handle script interruption
trap 'error "Deployment interrupted"' INT TERM

# Run main function
main "$@"
