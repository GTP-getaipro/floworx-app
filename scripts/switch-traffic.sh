#!/bin/bash

# FloWorx Traffic Switching Script
# Switches traffic between blue and green environments for zero-downtime deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SWITCH_ID="switch-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/floworx-switch-${SWITCH_ID}.log"

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
TARGET_ENV=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --to)
            TARGET_ENV="$2"
            shift 2
            ;;
        *)
            error "Unknown option $1. Usage: $0 --to <blue|green>"
            ;;
    esac
done

# Validate required parameters
if [[ -z "$TARGET_ENV" ]]; then
    error "Usage: $0 --to <blue|green>"
fi

if [[ "$TARGET_ENV" != "blue" && "$TARGET_ENV" != "green" ]]; then
    error "Target environment must be 'blue' or 'green'"
fi

log "Starting FloWorx Traffic Switch"
log "Switch ID: $SWITCH_ID"
log "Target Environment: $TARGET_ENV"

# ============================================================================
# TRAFFIC SWITCHING FUNCTIONS
# ============================================================================

check_prerequisites() {
    log "Checking traffic switching prerequisites..."
    
    # Check if required tools are available
    command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
    command -v jq >/dev/null 2>&1 || error "jq is required but not installed"
    
    # Check if environment variables are set
    [[ -n "${CLOUDFLARE_API_TOKEN:-}" ]] || warning "CLOUDFLARE_API_TOKEN not set - DNS switching may not work"
    [[ -n "${LOAD_BALANCER_API_KEY:-}" ]] || warning "LOAD_BALANCER_API_KEY not set - load balancer switching may not work"
    
    success "Prerequisites check completed"
}

get_current_environment() {
    log "Determining current active environment..."
    
    # Check current DNS configuration
    CURRENT_ENV="unknown"
    
    # Try to determine from health check response
    HEALTH_RESPONSE=$(curl -s --max-time 10 "https://app.floworx-iq.com/api/health" || echo "{}")
    DEPLOYMENT_ENV=$(echo "$HEALTH_RESPONSE" | jq -r '.deployment_environment // "unknown"')
    
    if [[ "$DEPLOYMENT_ENV" != "unknown" ]]; then
        CURRENT_ENV="$DEPLOYMENT_ENV"
        log "Current environment detected from health check: $CURRENT_ENV"
    else
        # Fallback: assume opposite of target
        if [[ "$TARGET_ENV" == "blue" ]]; then
            CURRENT_ENV="green"
        else
            CURRENT_ENV="blue"
        fi
        warning "Could not detect current environment, assuming: $CURRENT_ENV"
    fi
    
    echo "$CURRENT_ENV"
}

validate_target_environment() {
    local target_env=$1
    log "Validating target environment: $target_env"
    
    # Determine target URL based on environment
    local target_url
    case "$target_env" in
        "green")
            target_url="${GREEN_ENVIRONMENT_URL:-https://green.floworx-iq.com}"
            ;;
        "blue")
            target_url="${BLUE_ENVIRONMENT_URL:-https://blue.floworx-iq.com}"
            ;;
        *)
            error "Unknown target environment: $target_env"
            ;;
    esac
    
    log "Validating target environment at: $target_url"
    
    # Health check with retries
    local max_attempts=5
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Health check attempt $attempt/$max_attempts..."
        
        if curl -f -s --max-time 10 "$target_url/api/health" > /dev/null; then
            success "Target environment health check passed"
            
            # Additional validation - check if it's the right deployment
            HEALTH_DATA=$(curl -s --max-time 10 "$target_url/api/health" || echo "{}")
            TARGET_STATUS=$(echo "$HEALTH_DATA" | jq -r '.status // "unknown"')
            
            if [[ "$TARGET_STATUS" == "ok" ]]; then
                success "Target environment is healthy and ready"
                return 0
            else
                warning "Target environment health status: $TARGET_STATUS"
            fi
        else
            warning "Health check failed (attempt $attempt/$max_attempts)"
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log "Waiting 10s before next attempt..."
            sleep 10
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "Target environment validation failed after $max_attempts attempts"
}

create_traffic_switch_backup() {
    log "Creating traffic switch backup..."
    
    # Get current configuration
    CURRENT_CONFIG=$(curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN:-}" \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID:-}/dns_records" || echo "{}")
    
    # Save backup
    echo "$CURRENT_CONFIG" > "/tmp/traffic-backup-${SWITCH_ID}.json"
    
    success "Traffic configuration backup created: /tmp/traffic-backup-${SWITCH_ID}.json"
}

switch_dns_records() {
    local target_env=$1
    log "Switching DNS records to $target_env environment..."
    
    # Determine target IP/CNAME based on environment
    local target_record
    case "$target_env" in
        "green")
            target_record="${GREEN_DNS_TARGET:-green.floworx-iq.com}"
            ;;
        "blue")
            target_record="${BLUE_DNS_TARGET:-blue.floworx-iq.com}"
            ;;
    esac
    
    log "Updating DNS to point to: $target_record"
    
    # Update DNS record via Cloudflare API (if configured)
    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
        log "Updating Cloudflare DNS records..."
        
        # Get current DNS record ID
        DNS_RECORD_ID=$(curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
            "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records?name=app.floworx-iq.com" | \
            jq -r '.result[0].id // empty')
        
        if [[ -n "$DNS_RECORD_ID" ]]; then
            # Update DNS record
            UPDATE_RESPONSE=$(curl -s -X PUT \
                -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
                -H "Content-Type: application/json" \
                -d "{\"type\":\"CNAME\",\"name\":\"app\",\"content\":\"$target_record\",\"ttl\":300}" \
                "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/dns_records/$DNS_RECORD_ID")
            
            UPDATE_SUCCESS=$(echo "$UPDATE_RESPONSE" | jq -r '.success // false')
            
            if [[ "$UPDATE_SUCCESS" == "true" ]]; then
                success "DNS records updated successfully"
            else
                error "Failed to update DNS records: $UPDATE_RESPONSE"
            fi
        else
            warning "Could not find DNS record ID for app.floworx-iq.com"
        fi
    else
        warning "Cloudflare credentials not configured - skipping DNS update"
    fi
}

switch_load_balancer() {
    local target_env=$1
    log "Switching load balancer to $target_env environment..."
    
    # Update load balancer configuration (implementation depends on your load balancer)
    if [[ -n "${LOAD_BALANCER_API_KEY:-}" ]]; then
        log "Updating load balancer configuration..."
        
        # Example for generic load balancer API
        local target_backend
        case "$target_env" in
            "green")
                target_backend="${GREEN_BACKEND_URL:-https://green-backend.floworx-iq.com}"
                ;;
            "blue")
                target_backend="${BLUE_BACKEND_URL:-https://blue-backend.floworx-iq.com}"
                ;;
        esac
        
        # Update load balancer (this is a generic example)
        LB_RESPONSE=$(curl -s -X POST \
            -H "Authorization: Bearer $LOAD_BALANCER_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"backend\":\"$target_backend\",\"environment\":\"$target_env\"}" \
            "${LOAD_BALANCER_API_URL:-https://api.loadbalancer.com/v1/switch}" || echo "{}")
        
        LB_SUCCESS=$(echo "$LB_RESPONSE" | jq -r '.success // false')
        
        if [[ "$LB_SUCCESS" == "true" ]]; then
            success "Load balancer updated successfully"
        else
            warning "Load balancer update may have failed: $LB_RESPONSE"
        fi
    else
        warning "Load balancer credentials not configured - skipping load balancer update"
    fi
}

verify_traffic_switch() {
    local target_env=$1
    log "Verifying traffic switch to $target_env..."
    
    # Wait for DNS propagation
    log "Waiting for DNS propagation (30 seconds)..."
    sleep 30
    
    # Verify the switch worked
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Verification attempt $attempt/$max_attempts..."
        
        # Check if we're hitting the right environment
        HEALTH_RESPONSE=$(curl -s --max-time 10 "https://app.floworx-iq.com/api/health" || echo "{}")
        CURRENT_ENV=$(echo "$HEALTH_RESPONSE" | jq -r '.deployment_environment // "unknown"')
        
        if [[ "$CURRENT_ENV" == "$target_env" ]]; then
            success "Traffic switch verification successful - now serving from $target_env"
            
            # Additional functional test
            run_post_switch_tests
            return 0
        else
            warning "Still serving from $CURRENT_ENV (expected $target_env)"
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log "Waiting 15s before next verification attempt..."
            sleep 15
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "Traffic switch verification failed after $max_attempts attempts"
}

run_post_switch_tests() {
    log "Running post-switch functional tests..."
    
    # Test 1: Basic health check
    if curl -f -s --max-time 10 "https://app.floworx-iq.com/api/health" > /dev/null; then
        success "Health check passed"
    else
        error "Health check failed after traffic switch"
    fi
    
    # Test 2: Authentication test
    TEST_EMAIL="switch-test-$(date +%s)@example.com"
    AUTH_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"SwitchTest123!\",\"firstName\":\"Switch\",\"lastName\":\"Test\"}" \
        "https://app.floworx-iq.com/api/auth/test-register" || echo "{}")
    
    AUTH_SUCCESS=$(echo "$AUTH_RESPONSE" | jq -r '.success // false')
    if [[ "$AUTH_SUCCESS" == "true" ]]; then
        success "Authentication test passed"
    else
        warning "Authentication test failed: $AUTH_RESPONSE"
    fi
    
    success "Post-switch tests completed"
}

create_switch_manifest() {
    log "Creating traffic switch manifest..."
    
    cat > "/tmp/traffic-switch-manifest-${SWITCH_ID}.json" << EOF
{
    "switch_id": "$SWITCH_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "target_environment": "$TARGET_ENV",
    "previous_environment": "$(get_current_environment)",
    "status": "completed",
    "verification": "passed",
    "rollback_info": {
        "backup_file": "/tmp/traffic-backup-${SWITCH_ID}.json",
        "switch_command": "$0 --to $(get_current_environment)"
    }
}
EOF
    
    success "Traffic switch manifest created: /tmp/traffic-switch-manifest-${SWITCH_ID}.json"
}

# ============================================================================
# MAIN TRAFFIC SWITCHING FLOW
# ============================================================================

main() {
    log "=========================================="
    log "FloWorx Traffic Switch Started"
    log "=========================================="
    
    # Step 1: Prerequisites
    check_prerequisites
    
    # Step 2: Get current environment
    CURRENT_ENV=$(get_current_environment)
    
    if [[ "$CURRENT_ENV" == "$TARGET_ENV" ]]; then
        warning "Already serving from $TARGET_ENV environment"
        log "No traffic switch needed"
        exit 0
    fi
    
    log "Switching from $CURRENT_ENV to $TARGET_ENV"
    
    # Step 3: Validate target environment
    validate_target_environment "$TARGET_ENV"
    
    # Step 4: Create backup
    create_traffic_switch_backup
    
    # Step 5: Switch DNS records
    switch_dns_records "$TARGET_ENV"
    
    # Step 6: Switch load balancer
    switch_load_balancer "$TARGET_ENV"
    
    # Step 7: Verify switch
    verify_traffic_switch "$TARGET_ENV"
    
    # Step 8: Create manifest
    create_switch_manifest
    
    log "=========================================="
    success "Traffic Switch Completed Successfully!"
    log "Switch ID: $SWITCH_ID"
    log "Now serving from: $TARGET_ENV"
    log "Previous environment: $CURRENT_ENV"
    log "Log file: $LOG_FILE"
    log "=========================================="
}

# Handle script interruption
trap 'error "Traffic switch interrupted"' INT TERM

# Run main function
main "$@"
