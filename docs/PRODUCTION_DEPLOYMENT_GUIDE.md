# FloWorx Production Monitoring Deployment Guide

## 🚀 Overview

This guide provides comprehensive instructions for deploying FloWorx's enterprise-grade monitoring infrastructure to production. The system includes real-time performance monitoring, intelligent error tracking, business-driven alerting, automated stakeholder reporting, and adaptive threshold learning.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 16.0.0 or higher
- **PostgreSQL**: Version 12 or higher
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 10GB free space
- **Network**: Outbound HTTPS access for external integrations

### Required Services
- **Database**: PostgreSQL with connection pooling
- **Email Service**: SMTP server for notifications
- **Optional**: N8N instance for workflow monitoring
- **Optional**: Redis for caching (recommended for high traffic)

## 🔧 Pre-Deployment Setup

### 1. Environment Configuration

Copy the production environment template:
```bash
cp .env.production.template .env.production
```

Configure the following critical settings:

#### Core Settings
```env
NODE_ENV=production
APP_VERSION=1.0.0
DATABASE_URL=postgresql://user:pass@host:5432/floworx_prod
JWT_SECRET=your_secure_jwt_secret_minimum_32_chars
ENCRYPTION_KEY=your_32_character_encryption_key
```

#### Monitoring Thresholds
```env
MONITOR_SLOW_QUERY_MS=500
MONITOR_CRITICAL_QUERY_MS=2000
MONITOR_ERROR_RATE=0.02
MONITOR_CRITICAL_ERROR_RATE=0.05
```

#### Alert Configuration
```env
SLACK_ALERTS_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK
EMAIL_ALERTS_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_USER=alerts@floworx-iq.com
CRITICAL_ALERT_EMAILS=cto@floworx-iq.com,devops@floworx-iq.com
```

### 2. Database Setup

Create production database and user:
```sql
CREATE DATABASE floworx_production;
CREATE USER floworx_user WITH ENCRYPTED PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE floworx_production TO floworx_user;
```

Run database migrations:
```bash
npm run migrate:production
```

### 3. SSL/TLS Configuration

For production deployment, ensure SSL is properly configured:
```env
SSL_ENABLED=true
SSL_CERT_PATH=/path/to/ssl/cert.pem
SSL_KEY_PATH=/path/to/ssl/key.pem
```

## 🚀 Deployment Process

### Automated Deployment

Run the automated deployment script:
```bash
# Standard deployment
node scripts/deploy-production-monitoring.js

# Verbose output
node scripts/deploy-production-monitoring.js --verbose

# Dry run (validation only)
node scripts/deploy-production-monitoring.js --dry-run
```

### Manual Deployment Steps

If you prefer manual deployment:

#### 1. Install Dependencies
```bash
npm ci --production
```

#### 2. Build Application
```bash
npm run build
```

#### 3. Start Services
```bash
# Start with PM2 (recommended)
pm2 start ecosystem.config.js --env production

# Or start directly
npm run start:production
```

## 📊 Deployment Phases

The automated deployment executes these phases:

### Phase 1: Initialization
- ✅ Validates environment configuration
- ✅ Checks database connectivity
- ✅ Verifies external service availability

### Phase 2: Core Services
- ✅ Initializes real-time monitoring
- ✅ Sets up error tracking
- ✅ Configures production monitoring service

### Phase 3: Monitoring Integration
- ✅ Connects monitoring services
- ✅ Configures data flow
- ✅ Sets up cross-service events

### Phase 4: Alerting Setup
- ✅ Initializes business alerting engine
- ✅ Configures alert channels (Slack, Email, PagerDuty)
- ✅ Sets up escalation procedures

### Phase 5: Reporting Configuration
- ✅ Initializes stakeholder reporting
- ✅ Configures automated report schedules
- ✅ Tests report generation

### Phase 6: Adaptive Learning
- ✅ Initializes adaptive threshold service
- ✅ Configures machine learning parameters
- ✅ Starts threshold adaptation

### Phase 7: Health Validation
- ✅ Performs comprehensive health checks
- ✅ Validates all services
- ✅ Tests alert generation

### Phase 8: Production Ready
- ✅ Generates deployment summary
- ✅ Sends deployment notifications
- ✅ Enables production monitoring

## 🔍 Post-Deployment Verification

### 1. Service Health Check
```bash
curl https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "connected",
    "monitoring": "active",
    "alerting": "configured",
    "reporting": "scheduled"
  }
}
```

### 2. Monitoring Dashboard
Access the monitoring dashboard:
```
https://your-domain.com/api/monitoring/dashboard
```

### 3. Test Alert Generation
Trigger a test alert:
```bash
curl -X POST https://your-domain.com/api/monitoring/test-alert \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### 4. Verify Reporting
Check that reports are scheduled:
```bash
curl https://your-domain.com/api/reports/status \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 📈 Monitoring Configuration

### Business Metrics Tracked
- **User Onboarding**: Completion rates, time-to-value
- **OAuth Connections**: Success rates, failure patterns
- **Workflow Executions**: Performance, error rates
- **System Performance**: Response times, resource usage

### Alert Severity Levels
- **Critical**: Immediate response required (5-15 min escalation)
- **High**: Response within 30 minutes
- **Medium**: Response within 2 hours
- **Low**: Response within 24 hours

### Adaptive Thresholds
The system automatically learns and adjusts thresholds based on:
- Historical performance patterns
- Business hours vs off-hours usage
- Seasonal trends and anomalies
- User behavior patterns

## 📊 Stakeholder Reports

### Executive Dashboard (Daily)
- Business KPIs and growth metrics
- System health summary
- Revenue impact analysis
- Key issues and resolutions

### Operations Report (Hourly)
- System performance metrics
- Error rates and analysis
- SLA compliance status
- Infrastructure health

### Development Metrics (Daily)
- Code quality indicators
- Performance optimization opportunities
- Error patterns and resolution times
- Deployment success rates

### Customer Success Report (Weekly)
- User engagement metrics
- Feature adoption rates
- Onboarding success analysis
- Support ticket insights

## 🚨 Alerting Rules

### SLA-Based Alerts
- API response time > 2 seconds (Critical)
- System availability < 99.9% (Critical)
- Error rate > 5% (High)

### Business Impact Alerts
- Onboarding failure rate > 20% (Critical)
- OAuth connection failure rate > 10% (Critical)
- Payment processing failures > 2% (Critical)

### Time-Based Rules
- Enhanced monitoring during business hours
- Different escalation procedures for off-hours
- Peak usage hour adjustments

## 🔧 Maintenance and Operations

### Daily Tasks
- Review overnight alerts and resolutions
- Check system performance metrics
- Validate backup completion
- Review error trends

### Weekly Tasks
- Analyze performance trends
- Review and adjust alert thresholds
- Update stakeholder reports
- Capacity planning review

### Monthly Tasks
- Security audit and updates
- Performance optimization review
- Disaster recovery testing
- Stakeholder feedback collection

## 🛠️ Troubleshooting

### Common Issues

#### Deployment Fails at Database Phase
```bash
# Check database connectivity
psql -h localhost -U floworx_user -d floworx_production -c "SELECT 1;"

# Verify environment variables
echo $DATABASE_URL
```

#### Alerts Not Being Sent
```bash
# Check alert channel configuration
curl https://your-domain.com/api/monitoring/status

# Test Slack webhook
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test message"}'
```

#### High Memory Usage
```bash
# Check service status
pm2 status
pm2 monit

# Restart services if needed
pm2 restart all
```

### Log Locations
- Application logs: `/var/log/floworx/app.log`
- Error logs: `/var/log/floworx/errors/`
- Monitoring logs: `/var/log/floworx/monitoring.log`

## 📞 Support and Escalation

### Level 1: Automated Response
- Immediate logging and diagnostics
- Automated recovery attempts
- Slack notifications

### Level 2: On-Call Engineer (15 minutes)
- PagerDuty alerts
- Incident ticket creation
- Detailed diagnostics

### Level 3: Engineering Manager (45 minutes)
- Management escalation
- War room activation
- Customer success notification

### Level 4: Executive Team (2 hours)
- C-level notification
- Crisis protocol activation
- Customer communication preparation

## 🔄 Continuous Improvement

The monitoring system continuously learns and improves through:

- **Adaptive Thresholds**: Machine learning-based threshold optimization
- **Pattern Recognition**: Automatic detection of usage patterns
- **Anomaly Detection**: Identification of unusual behavior
- **Performance Optimization**: Automated recommendations for improvements

## 📚 Additional Resources

- [API Documentation](./API_DOCUMENTATION.md)
- [Monitoring Architecture](./MONITORING_ARCHITECTURE.md)
- [Alert Runbooks](./ALERT_RUNBOOKS.md)
- [Performance Tuning Guide](./PERFORMANCE_TUNING.md)

---

**Need Help?** Contact the DevOps team at devops@floworx-iq.com or create an issue in the monitoring repository.
