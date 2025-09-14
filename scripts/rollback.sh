#!/bin/bash

# FloWorx Automated Rollback Script
# Performs automated rollback to previous stable deployment

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLBACK_ID="rollback-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="/tmp/floworx-rollback-${ROLLBACK_ID}.log"

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
ENVIRONMENT="production"
REASON=""
TARGET_DEPLOYMENT=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --reason)
            REASON="$2"
            shift 2
            ;;
        --to-deployment)
            TARGET_DEPLOYMENT="$2"
            shift 2
            ;;
        *)
            error "Unknown option $1. Usage: $0 [--environment production] [--reason 'reason'] [--to-deployment deployment-id]"
            ;;
    esac
done

log "Starting FloWorx Automated Rollback"
log "Rollback ID: $ROLLBACK_ID"
log "Environment: $ENVIRONMENT"
log "Reason: ${REASON:-'Not specified'}"

# ============================================================================
# ROLLBACK FUNCTIONS
# ============================================================================

check_rollback_prerequisites() {
    log "Checking rollback prerequisites..."
    
    # Check if required tools are available
    command -v curl >/dev/null 2>&1 || error "curl is required but not installed"
    command -v jq >/dev/null 2>&1 || error "jq is required but not installed"
    
    # Check if we have backup information
    if [[ -z "$TARGET_DEPLOYMENT" ]]; then
        # Try to find the most recent backup
        LATEST_BACKUP=$(ls -t /tmp/floworx-backup-*.json 2>/dev/null | head -1 || echo "")
        if [[ -n "$LATEST_BACKUP" ]]; then
            log "Found latest backup: $LATEST_BACKUP"
            TARGET_DEPLOYMENT=$(basename "$LATEST_BACKUP" .json | sed 's/floworx-backup-//')
        else
            warning "No backup files found, will attempt to rollback to previous stable version"
        fi
    fi
    
    success "Prerequisites check completed"
}

get_current_deployment_info() {
    log "Getting current deployment information..."
    
    # Get current deployment info from health endpoint
    CURRENT_INFO=$(curl -s --max-time 10 "https://app.floworx-iq.com/api/health" || echo "{}")
    CURRENT_DEPLOYMENT=$(echo "$CURRENT_INFO" | jq -r '.deployment_id // "unknown"')
    CURRENT_VERSION=$(echo "$CURRENT_INFO" | jq -r '.version // "unknown"')
    CURRENT_ENV=$(echo "$CURRENT_INFO" | jq -r '.deployment_environment // "unknown"')
    
    log "Current deployment ID: $CURRENT_DEPLOYMENT"
    log "Current version: $CURRENT_VERSION"
    log "Current environment: $CURRENT_ENV"
    
    # Save current state for potential re-rollback
    cat > "/tmp/pre-rollback-state-${ROLLBACK_ID}.json" << EOF
{
    "rollback_id": "$ROLLBACK_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "current_deployment": "$CURRENT_DEPLOYMENT",
    "current_version": "$CURRENT_VERSION",
    "current_environment": "$CURRENT_ENV",
    "reason": "$REASON"
}
EOF
    
    success "Current deployment information captured"
}

determine_rollback_target() {
    log "Determining rollback target..."
    
    if [[ -n "$TARGET_DEPLOYMENT" ]]; then
        log "Using specified target deployment: $TARGET_DEPLOYMENT"
        return
    fi
    
    # Try to determine the previous stable deployment
    # This would typically query your deployment history API
    # For now, we'll use a simple heuristic
    
    # Check if we're currently on green, rollback to blue (and vice versa)
    if [[ "$CURRENT_ENV" == "green" ]]; then
        ROLLBACK_ENV="blue"
        ROLLBACK_URL="${BLUE_ENVIRONMENT_URL:-https://blue.floworx-iq.com}"
    elif [[ "$CURRENT_ENV" == "blue" ]]; then
        ROLLBACK_ENV="green"
        ROLLBACK_URL="${GREEN_ENVIRONMENT_URL:-https://green.floworx-iq.com}"
    else
        # Default rollback strategy
        ROLLBACK_ENV="blue"
        ROLLBACK_URL="${BLUE_ENVIRONMENT_URL:-https://blue.floworx-iq.com}"
        warning "Could not determine current environment, defaulting to blue"
    fi
    
    log "Rollback target environment: $ROLLBACK_ENV"
    log "Rollback target URL: $ROLLBACK_URL"
}

validate_rollback_target() {
    log "Validating rollback target..."
    
    # Health check the rollback target
    local max_attempts=3
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Validating rollback target (attempt $attempt/$max_attempts)..."
        
        if curl -f -s --max-time 10 "$ROLLBACK_URL/api/health" > /dev/null; then
            # Get target deployment info
            TARGET_INFO=$(curl -s --max-time 10 "$ROLLBACK_URL/api/health" || echo "{}")
            TARGET_STATUS=$(echo "$TARGET_INFO" | jq -r '.status // "unknown"')
            TARGET_DEPLOYMENT_ID=$(echo "$TARGET_INFO" | jq -r '.deployment_id // "unknown"')
            
            if [[ "$TARGET_STATUS" == "ok" ]]; then
                success "Rollback target is healthy"
                log "Target deployment ID: $TARGET_DEPLOYMENT_ID"
                return 0
            else
                warning "Rollback target health status: $TARGET_STATUS"
            fi
        else
            warning "Rollback target health check failed"
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log "Waiting 10s before next attempt..."
            sleep 10
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "Rollback target validation failed - cannot proceed with rollback"
}

create_rollback_backup() {
    log "Creating rollback backup..."
    
    # Backup current configuration before rollback
    CURRENT_CONFIG=$(curl -s -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN:-}" \
        "https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID:-}/dns_records" || echo "{}")
    
    # Save rollback backup
    cat > "/tmp/rollback-backup-${ROLLBACK_ID}.json" << EOF
{
    "rollback_id": "$ROLLBACK_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "reason": "$REASON",
    "current_deployment": "$CURRENT_DEPLOYMENT",
    "target_environment": "$ROLLBACK_ENV",
    "dns_config": $CURRENT_CONFIG
}
EOF
    
    success "Rollback backup created: /tmp/rollback-backup-${ROLLBACK_ID}.json"
}

execute_traffic_rollback() {
    log "Executing traffic rollback..."
    
    # Use the traffic switching script to rollback
    if [[ -f "$SCRIPT_DIR/switch-traffic.sh" ]]; then
        log "Using traffic switching script for rollback..."
        bash "$SCRIPT_DIR/switch-traffic.sh" --to "$ROLLBACK_ENV"
    else
        # Manual rollback process
        log "Performing manual traffic rollback..."
        manual_traffic_rollback
    fi
    
    success "Traffic rollback completed"
}

manual_traffic_rollback() {
    log "Performing manual traffic rollback..."
    
    # Update DNS records
    if [[ -n "${CLOUDFLARE_API_TOKEN:-}" && -n "${CLOUDFLARE_ZONE_ID:-}" ]]; then
        log "Updating DNS records for rollback..."
        
        # Determine target DNS record
        local target_record
        case "$ROLLBACK_ENV" in
            "green")
                target_record="${GREEN_DNS_TARGET:-green.floworx-iq.com}"
                ;;
            "blue")
                target_record="${BLUE_DNS_TARGET:-blue.floworx-iq.com}"
                ;;
        esac
        
        # Get DNS record ID
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
                success "DNS records updated for rollback"
            else
                error "Failed to update DNS records: $UPDATE_RESPONSE"
            fi
        else
            warning "Could not find DNS record ID"
        fi
    else
        warning "DNS credentials not configured - manual DNS update required"
    fi
}

verify_rollback() {
    log "Verifying rollback..."
    
    # Wait for DNS propagation
    log "Waiting for DNS propagation (45 seconds)..."
    sleep 45
    
    # Verify rollback worked
    local max_attempts=10
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        log "Rollback verification attempt $attempt/$max_attempts..."
        
        # Check if we're now hitting the rollback target
        HEALTH_RESPONSE=$(curl -s --max-time 10 "https://app.floworx-iq.com/api/health" || echo "{}")
        NEW_DEPLOYMENT=$(echo "$HEALTH_RESPONSE" | jq -r '.deployment_id // "unknown"')
        NEW_ENV=$(echo "$HEALTH_RESPONSE" | jq -r '.deployment_environment // "unknown"')
        NEW_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // "unknown"')
        
        if [[ "$NEW_ENV" == "$ROLLBACK_ENV" && "$NEW_STATUS" == "ok" ]]; then
            success "Rollback verification successful"
            log "Now serving from: $NEW_ENV"
            log "New deployment ID: $NEW_DEPLOYMENT"
            
            # Run post-rollback tests
            run_post_rollback_tests
            return 0
        else
            warning "Still serving from $NEW_ENV (expected $ROLLBACK_ENV), status: $NEW_STATUS"
        fi
        
        if [[ $attempt -lt $max_attempts ]]; then
            log "Waiting 15s before next verification attempt..."
            sleep 15
        fi
        
        attempt=$((attempt + 1))
    done
    
    error "Rollback verification failed after $max_attempts attempts"
}

run_post_rollback_tests() {
    log "Running post-rollback tests..."
    
    # Test 1: Basic health check
    if curl -f -s --max-time 10 "https://app.floworx-iq.com/api/health" > /dev/null; then
        success "Health check passed"
    else
        error "Health check failed after rollback"
    fi
    
    # Test 2: Authentication test
    TEST_EMAIL="rollback-test-$(date +%s)@example.com"
    AUTH_RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"RollbackTest123!\",\"firstName\":\"Rollback\",\"lastName\":\"Test\"}" \
        "https://app.floworx-iq.com/api/auth/test-register" || echo "{}")
    
    AUTH_SUCCESS=$(echo "$AUTH_RESPONSE" | jq -r '.success // false')
    if [[ "$AUTH_SUCCESS" == "true" ]]; then
        success "Authentication test passed"
    else
        warning "Authentication test failed: $AUTH_RESPONSE"
    fi
    
    success "Post-rollback tests completed"
}

send_rollback_notification() {
    log "Sending rollback notifications..."
    
    # Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        SLACK_PAYLOAD=$(cat << EOF
{
    "text": "🔄 FloWorx Rollback Executed",
    "attachments": [{
        "color": "warning",
        "fields": [
            {"title": "Rollback ID", "value": "$ROLLBACK_ID", "short": true},
            {"title": "Environment", "value": "$ENVIRONMENT", "short": true},
            {"title": "Reason", "value": "${REASON:-'Not specified'}", "short": false},
            {"title": "Previous Deployment", "value": "$CURRENT_DEPLOYMENT", "short": true},
            {"title": "Rolled Back To", "value": "$ROLLBACK_ENV", "short": true},
            {"title": "Timestamp", "value": "$(date -u +%Y-%m-%dT%H:%M:%SZ)", "short": true}
        ]
    }]
}
EOF
        )
        
        curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$SLACK_PAYLOAD" \
            "$SLACK_WEBHOOK_URL" > /dev/null || warning "Failed to send Slack notification"
    fi
    
    success "Rollback notifications sent"
}

create_rollback_manifest() {
    log "Creating rollback manifest..."
    
    cat > "/tmp/rollback-manifest-${ROLLBACK_ID}.json" << EOF
{
    "rollback_id": "$ROLLBACK_ID",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "environment": "$ENVIRONMENT",
    "reason": "$REASON",
    "previous_deployment": "$CURRENT_DEPLOYMENT",
    "rollback_target": "$ROLLBACK_ENV",
    "status": "completed",
    "verification": "passed",
    "backup_files": [
        "/tmp/pre-rollback-state-${ROLLBACK_ID}.json",
        "/tmp/rollback-backup-${ROLLBACK_ID}.json"
    ]
}
EOF
    
    success "Rollback manifest created: /tmp/rollback-manifest-${ROLLBACK_ID}.json"
}

# ============================================================================
# MAIN ROLLBACK FLOW
# ============================================================================

main() {
    log "=========================================="
    log "FloWorx Automated Rollback Started"
    log "=========================================="
    
    # Step 1: Prerequisites
    check_rollback_prerequisites
    
    # Step 2: Get current deployment info
    get_current_deployment_info
    
    # Step 3: Determine rollback target
    determine_rollback_target
    
    # Step 4: Validate rollback target
    validate_rollback_target
    
    # Step 5: Create rollback backup
    create_rollback_backup
    
    # Step 6: Execute traffic rollback
    execute_traffic_rollback
    
    # Step 7: Verify rollback
    verify_rollback
    
    # Step 8: Send notifications
    send_rollback_notification
    
    # Step 9: Create manifest
    create_rollback_manifest
    
    log "=========================================="
    success "Automated Rollback Completed Successfully!"
    log "Rollback ID: $ROLLBACK_ID"
    log "Rolled back from: $CURRENT_DEPLOYMENT"
    log "Now serving from: $ROLLBACK_ENV"
    log "Reason: ${REASON:-'Not specified'}"
    log "Log file: $LOG_FILE"
    log "=========================================="
}

# Handle script interruption
trap 'error "Rollback interrupted"' INT TERM

# Run main function
main "$@"
