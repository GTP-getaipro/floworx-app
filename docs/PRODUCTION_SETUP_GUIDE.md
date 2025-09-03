# FloWorx Production Setup Guide

## 🚀 Complete Production Deployment Walkthrough

This guide provides step-by-step instructions for deploying FloWorx monitoring infrastructure to production using the automated scripts we've created.

---

## **Step 1: Configure Environment Variables**

### **1.1 Run the Interactive Environment Setup**

```bash
# Navigate to your FloWorx project directory
cd /path/to/FloworxInvite

# Run the interactive environment configuration
node scripts/setup-production-environment.js
```

The script will guide you through configuring:
- ✅ **Core application settings** (Node.js environment, app version, port)
- ✅ **Database configuration** (PostgreSQL connection details)
- ✅ **Security settings** (JWT secrets, encryption keys - auto-generated)
- ✅ **Monitoring thresholds** (performance and error rate limits)
- ✅ **Alert channels** (Slack, Email, PagerDuty configuration)
- ✅ **Reporting settings** (stakeholder email lists, schedules)
- ✅ **External services** (N8N, Supabase, Google OAuth)

### **1.2 Non-Interactive Setup (for CI/CD)**

```bash
# For automated deployments without user input
node scripts/setup-production-environment.js --non-interactive
```

### **1.3 Review Generated Configuration**

```bash
# Review the generated .env.production file
cat .env.production

# Make sure to update any placeholder values:
# - Replace 'CHANGE_ME_IN_PRODUCTION' with actual passwords
# - Update webhook URLs with real endpoints
# - Verify email addresses and API keys
```

**⚠️ Security Note:** The `.env.production` file contains sensitive information. Never commit it to version control.

---

## **Step 2: Set Up Alert Channels**

### **2.1 Configure Slack Integration**

1. **Create Slack App:**
   - Go to https://api.slack.com/apps
   - Create new app for your workspace
   - Enable Incoming Webhooks
   - Copy webhook URL to `SLACK_WEBHOOK_URL`

2. **Test Slack Integration:**
   ```bash
   node scripts/setup-alert-channels.js
   ```

### **2.2 Configure Email Alerts**

1. **SMTP Configuration:**
   - Use Gmail, SendGrid, or your corporate email server
   - Enable 2FA and create app-specific password for Gmail
   - Update SMTP settings in `.env.production`

2. **Email Recipients:**
   ```env
   CRITICAL_ALERT_EMAILS=cto@floworx-iq.com,devops@floworx-iq.com
   HIGH_ALERT_EMAILS=engineering@floworx-iq.com,operations@floworx-iq.com
   MEDIUM_ALERT_EMAILS=team@floworx-iq.com
   ```

### **2.3 Configure PagerDuty (Optional)**

1. **Create PagerDuty Service:**
   - Log into PagerDuty
   - Create new service for FloWorx
   - Copy integration key to `PAGERDUTY_INTEGRATION_KEY`

2. **Test All Alert Channels:**
   ```bash
   node scripts/setup-alert-channels.js
   ```

**Expected Output:**
```
📱 Testing Slack integration...
  ✅ Slack integration test successful
📧 Testing Email integration...
  ✅ Test email sent successfully
📟 Testing PagerDuty integration...
  ✅ PagerDuty integration test successful
```

---

## **Step 3: Run Deployment Script with Dry-Run**

### **3.1 Validate Configuration First**

```bash
# Perform dry-run validation without making changes
node scripts/deploy-production-monitoring.js --dry-run
```

**Expected Output:**
```
🚀 FloWorx Production Monitoring Deployment
==========================================
Environment: production
Version: 1.0.0

🔍 DRY RUN MODE - No actual changes will be made

🔍 Running pre-deployment checks...
  📋 Checking environment variables...
  ✅ Environment variables validated (4 required, 15 optional)
  💻 Checking system resources...
  ✅ System resources sufficient
  🌐 Checking external dependencies...
  ✅ External dependencies verified

✅ Dry run completed successfully
```

### **3.2 Fix Any Issues**

If the dry-run fails, address the issues:

```bash
# Common issues and solutions:

# Missing environment variables
echo "Check .env.production for missing required variables"

# Database connectivity issues
psql -h localhost -U floworx_user -d floworx_production -c "SELECT 1;"

# SMTP configuration issues
# Test email settings manually or check firewall/authentication
```

### **3.3 Run Full Deployment**

```bash
# Execute the full production deployment
node scripts/deploy-production-monitoring.js --verbose
```

**Expected 8-Phase Deployment:**
```
📋 Phase 1/8: initialization
✅ Phase 1/8 completed: initialization

📋 Phase 2/8: core_services
✅ Phase 2/8 completed: core_services

📋 Phase 3/8: monitoring_integration
✅ Phase 3/8 completed: monitoring_integration

📋 Phase 4/8: alerting_setup
✅ Phase 4/8 completed: alerting_setup

📋 Phase 5/8: reporting_configuration
✅ Phase 5/8 completed: reporting_configuration

📋 Phase 6/8: adaptive_learning
✅ Phase 6/8 completed: adaptive_learning

📋 Phase 7/8: health_validation
✅ Phase 7/8 completed: health_validation

📋 Phase 8/8: production_ready
✅ Phase 8/8 completed: production_ready

🎉 Production monitoring deployment completed successfully!
```

---

## **Step 4: Validate Health Checks and Test Alerts**

### **4.1 Run Comprehensive Health Validation**

```bash
# Validate all monitoring components
node scripts/validate-deployment.js
```

**Expected Validation Results:**
```
🔧 Validating environment setup...
  ✅ All required environment variables present

🗄️ Validating database connectivity...
  ✅ Database connectivity verified (5 tables found)

🏥 Validating application health...
  ✅ Application health check passed

📊 Validating monitoring services...
  ✅ Monitoring services validated

🚨 Validating alerting system...
  ✅ Alerting system validated

📈 Validating reporting system...
  ✅ Reporting system validated

🔐 Validating security configuration...
  ✅ Security configuration validated

⚡ Validating performance baseline...
  ✅ Performance baseline validated (avg: 145ms)
```

### **4.2 Test Alert Generation**

```bash
# Test all monitoring and alert components
node scripts/monitor-health-and-alerts.js
```

This will:
- ✅ **Test system health endpoints**
- ✅ **Generate test alerts** at different severity levels
- ✅ **Validate monitoring metrics** collection
- ✅ **Test error tracking** functionality
- ✅ **Verify reporting system** operation
- ✅ **Check adaptive thresholds** (if available)

### **4.3 Manual Alert Testing**

```bash
# Test specific alert channels
curl -X POST http://localhost:3000/api/monitoring/test-alert \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "manual_test",
    "severity": "high",
    "message": "Manual production deployment test alert"
  }'
```

---

## **Step 5: Monitor Adaptive Learning System**

### **5.1 Start Adaptive Learning Monitoring**

```bash
# Start continuous monitoring of the adaptive threshold system
node scripts/monitor-adaptive-learning.js
```

**Expected Output:**
```
🧠 FloWorx Adaptive Learning Monitor
===================================
Environment: production
Base URL: https://app.floworx-iq.com

🔐 Authenticating admin user...
  ✅ Admin authentication successful

🔍 Checking adaptive learning availability...
  ✅ Adaptive learning system is available

📊 Starting adaptive learning monitoring...
  📋 Collecting baseline data...
    ✅ Baseline data collected
  🎯 Monitoring threshold adaptations...
    ✅ Threshold adaptation monitoring active
  📈 Analyzing learning effectiveness...
    ✅ Learning effectiveness analysis completed
      📊 Adaptation Rate: 0.50 per hour
      🎯 Threshold Stability: 85.0%
      📈 Performance Improvement: 12.5%

🔄 Adaptive learning monitoring started. Press Ctrl+C to stop.
```

### **5.2 Monitor Learning Progress**

The adaptive learning system will:
- 📊 **Collect performance metrics** every minute
- 🎯 **Adapt thresholds** based on statistical analysis
- 📈 **Learn usage patterns** (business hours, seasonality)
- 🧠 **Improve accuracy** over time with confidence scoring

### **5.3 Review Learning Reports**

```bash
# Check hourly learning reports
ls -la reports/adaptive-learning/

# View latest learning effectiveness
cat reports/adaptive-learning/learning-report-$(date +%H).json
```

---

## **🎯 Production Readiness Checklist**

### **Environment Configuration** ✅
- [ ] `.env.production` file created and configured
- [ ] Database connection tested and working
- [ ] Security keys generated and secure
- [ ] All required environment variables set

### **Alert Channels** ✅
- [ ] Slack integration tested and working
- [ ] Email alerts configured and tested
- [ ] PagerDuty integration setup (if using)
- [ ] Alert recipients configured correctly

### **Monitoring System** ✅
- [ ] Real-time monitoring active
- [ ] Error tracking operational
- [ ] Business alerting rules configured
- [ ] Stakeholder reporting scheduled

### **Health Validation** ✅
- [ ] All health checks passing
- [ ] Test alerts generated successfully
- [ ] Performance baseline established
- [ ] Security configuration validated

### **Adaptive Learning** ✅
- [ ] Adaptive threshold system initialized
- [ ] Learning effectiveness monitoring active
- [ ] Baseline data collected
- [ ] Continuous optimization running

---

## **📊 Monitoring Dashboard Access**

Once deployed, access your monitoring dashboards:

```bash
# Monitoring Dashboard
https://your-domain.com/api/monitoring/dashboard

# Error Tracking
https://your-domain.com/api/errors/stats

# System Health
https://your-domain.com/api/health

# Adaptive Learning Status
https://your-domain.com/api/monitoring/adaptive-status
```

---

## **🚨 Troubleshooting Common Issues**

### **Deployment Fails at Database Phase**
```bash
# Check database connectivity
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"

# Verify environment variables
echo $DATABASE_URL
```

### **Alerts Not Being Sent**
```bash
# Test alert channels individually
node scripts/setup-alert-channels.js

# Check webhook URLs and credentials
curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"Test message"}'
```

### **Monitoring Data Not Collecting**
```bash
# Check monitoring service status
curl https://your-domain.com/api/monitoring/status

# Restart monitoring services if needed
pm2 restart all
```

---

## **📞 Support and Next Steps**

### **Immediate Actions After Deployment:**
1. **Monitor the first 24 hours** closely for any issues
2. **Review alert frequency** and adjust thresholds if needed
3. **Check stakeholder reports** are being generated and delivered
4. **Validate adaptive learning** is collecting data and adapting

### **Ongoing Maintenance:**
- **Weekly:** Review performance trends and optimization recommendations
- **Monthly:** Analyze adaptive learning effectiveness and tune parameters
- **Quarterly:** Review and update alert rules based on business changes

### **Getting Help:**
- Check the deployment logs in `./reports/` directory
- Review health check reports for specific issues
- Contact DevOps team at devops@floworx-iq.com

---

**🎉 Congratulations! Your FloWorx production monitoring system is now fully deployed and operational!**
