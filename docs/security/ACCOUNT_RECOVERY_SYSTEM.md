# 🔐 FloWorx Comprehensive Account Recovery System

## Overview

The FloWorx Account Recovery System provides a complete, production-ready solution for handling various account recovery scenarios including password resets, account lockouts, emergency access, and email changes.

## 🚀 Features

### Core Recovery Types
- **Password Reset**: Standard password reset via email
- **Account Recovery**: Full account recovery with multiple options
- **Emergency Access**: Temporary limited access for locked accounts
- **Account Lockout Recovery**: Automated and manual account unlocking
- **Email Change Recovery**: Secure email address updates

### Security Features
- **Progressive Lockout**: Increasing lockout durations for repeated failures
- **Rate Limiting**: Protection against brute force attacks
- **Token Expiration**: Time-limited recovery tokens
- **Audit Logging**: Comprehensive security event tracking
- **Multi-step Verification**: Identity verification before recovery
- **Backup Codes**: Alternative recovery method

## 📁 File Structure

```
backend/
├── routes/
│   ├── accountRecovery.js          # Account recovery API routes
│   └── passwordReset.js            # Enhanced password reset routes
├── services/
│   ├── accountRecoveryService.js   # Core recovery logic
│   └── passwordResetService.js     # Enhanced password reset logic
├── database/
│   └── account-recovery-schema.sql # Database schema
└── templates/
    └── account-recovery-email.html # Email template

frontend/src/components/
├── recovery/
│   ├── AccountRecoveryDashboard.js # Main recovery interface
│   ├── ChangeEmailStep.js          # Email change component
│   ├── SelectActionsStep.js        # Recovery options selection
│   ├── ResetPasswordStep.js        # Password reset component
│   └── EmergencyAccessStep.js      # Emergency access component
├── ForgotPassword.js               # Enhanced forgot password
└── ResetPassword.js                # Enhanced password reset
```

## 🛠️ Installation & Setup

### 1. Database Setup

Run the account recovery schema in your Supabase SQL Editor:

```sql
-- Execute the contents of backend/database/account-recovery-schema.sql
```

### 2. Backend Configuration

Add to your `.env` file:

```env
# Account Recovery Settings
ACCOUNT_RECOVERY_TOKEN_EXPIRY=86400000  # 24 hours in milliseconds
MAX_FAILED_LOGIN_ATTEMPTS=5
ACCOUNT_LOCKOUT_DURATION=900000         # 15 minutes in milliseconds
PROGRESSIVE_LOCKOUT_MULTIPLIER=2

# Email Settings (if not already configured)
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
FROM_EMAIL=noreply@floworx-iq.com
```

### 3. Frontend Routes

The system automatically integrates with your existing React Router setup via `App.js`.

## 🔄 Recovery Flows

### Password Reset Flow
1. User enters email on forgot password page
2. System checks for account lockout
3. Password reset email sent
4. User clicks link and creates new password
5. Account unlocked and login attempts reset

### Account Recovery Flow
1. User initiates account recovery
2. Identity verification via email
3. User selects recovery actions:
   - Reset password
   - Generate backup codes
   - Revoke all sessions
   - Enable 2FA
4. Actions executed in secure transaction
5. Recovery completion confirmation

### Emergency Access Flow
1. User requests emergency access
2. Identity verification
3. Temporary access granted with limitations:
   - 1-hour time limit
   - Read-only access to most features
   - Must complete full recovery during session

### Account Lockout Recovery
1. Automatic lockout after failed attempts
2. Progressive lockout duration increases
3. Recovery options presented:
   - Wait for automatic unlock
   - Use account recovery
   - Contact support

## 🔒 Security Features

### Progressive Lockout
- 1st lockout: 15 minutes
- 2nd lockout: 30 minutes  
- 3rd lockout: 60 minutes
- Continues doubling up to maximum

### Rate Limiting
- Password reset: 5 requests per 15 minutes
- Account recovery: 5 requests per 15 minutes
- Token verification: 10 requests per 5 minutes

### Audit Logging
All security events are logged with:
- User ID and email
- IP address and user agent
- Timestamp and action type
- Success/failure status
- Risk score (0-100)

### Token Security
- Cryptographically secure random tokens
- Time-limited expiration
- Single-use tokens
- Attempt counting with limits

## 📧 Email Templates

### Account Recovery Email
- Clear call-to-action
- Security warnings
- Recovery type identification
- Expiration time notice
- Security tips

### Password Reset Confirmation
- Success confirmation
- Security recommendations
- Login instructions
- Support contact info

## 🧪 Testing

### Manual Testing Scenarios

1. **Password Reset**
   ```
   1. Go to /forgot-password
   2. Enter valid email
   3. Check email for reset link
   4. Click link and reset password
   5. Verify login with new password
   ```

2. **Account Lockout**
   ```
   1. Attempt login with wrong password 5 times
   2. Verify account is locked
   3. Try forgot password - should show lockout notice
   4. Use account recovery option
   5. Complete recovery and verify unlock
   ```

3. **Emergency Access**
   ```
   1. Initiate emergency access recovery
   2. Verify limited functionality
   3. Complete password reset during session
   4. Verify full access restored
   ```

### API Testing

Use the following endpoints for testing:

```bash
# Check account lockout status
POST /api/account-recovery/check-lockout
{
  "email": "user@example.com"
}

# Initiate account recovery
POST /api/account-recovery/initiate
{
  "email": "user@example.com",
  "recoveryType": "account_recovery",
  "recoveryData": {}
}

# Verify recovery token
POST /api/account-recovery/verify-token
{
  "token": "recovery-token-here"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SMTP configuration
   - Verify email service credentials
   - Check spam/junk folders

2. **Database errors**
   - Ensure schema is properly installed
   - Check RLS policies are enabled
   - Verify user permissions

3. **Token validation failures**
   - Check token expiration times
   - Verify token format and encoding
   - Check attempt limits

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
DEBUG_RECOVERY=true
```

## 📊 Monitoring

### Key Metrics to Monitor
- Failed login attempt rates
- Account lockout frequency
- Recovery completion rates
- Token usage patterns
- Email delivery success rates

### Database Maintenance
- Run `cleanup_expired_tokens()` daily
- Monitor audit log size
- Archive old security logs (>90 days)

## 🔄 Future Enhancements

### Planned Features
- SMS-based recovery options
- Hardware security key support
- Machine learning risk scoring
- Advanced fraud detection
- Multi-language email templates

### Integration Opportunities
- Identity provider integration (Google, Microsoft)
- Customer support ticket creation
- Slack/Teams notifications for admins
- Webhook notifications for security events

## 📞 Support

For issues with the account recovery system:

1. Check the troubleshooting section above
2. Review audit logs for security events
3. Contact the development team with:
   - User email (if applicable)
   - Timestamp of issue
   - Error messages or logs
   - Steps to reproduce

## 🔐 Security Considerations

### Production Deployment
- Use HTTPS for all recovery endpoints
- Implement proper CORS policies
- Set up monitoring and alerting
- Regular security audits
- Backup recovery data securely

### Compliance
- GDPR: User data handling and deletion
- SOC 2: Security controls and monitoring
- HIPAA: If handling health data
- Industry-specific requirements

---

**FloWorx Account Recovery System v1.0**  
*Comprehensive, secure, and user-friendly account recovery for modern applications*
