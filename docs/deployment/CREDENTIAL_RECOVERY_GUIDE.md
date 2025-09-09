# 🔐 Floworx Credential Recovery System

## Overview

The Floworx Credential Recovery System provides comprehensive security measures to help users regain access to their accounts while maintaining the highest security standards. This system includes password reset, account recovery, and credential backup mechanisms.

## 🚀 Quick Setup

### 1. Database Migration
Run the password reset migration in your Supabase SQL Editor:
```sql
-- Run database-migration-password-reset.sql
```

### 2. Environment Variables
Add these required environment variables:
```env
# Encryption (CRITICAL - Generate a secure 64-character hex string)
ENCRYPTION_KEY=your_64_character_hex_encryption_key_here

# Email Configuration (Required for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_NAME=Floworx Team
FROM_EMAIL=noreply@floworx-iq.com

# Frontend URL (Required for reset links)
FRONTEND_URL=https://app.floworx-iq.com
```

### 3. Generate Encryption Key
```bash
# Generate a secure encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 🔧 Features

### 1. Password Reset Flow
- **Secure Token Generation**: Cryptographically secure 32-byte tokens
- **Rate Limiting**: Max 3 requests per 15 minutes per IP
- **Token Expiry**: 60-minute expiration for security
- **Single Use**: Tokens can only be used once
- **Email Verification**: Reset links sent via email

### 2. Account Recovery
- **Multiple Recovery Types**: Email change, account recovery, emergency access
- **Backup Codes**: 10 one-time backup codes for account recovery
- **Credential Backups**: Encrypted backups of OAuth tokens
- **Security Audit Log**: Complete audit trail of all recovery actions

### 3. Security Features
- **AES-256-GCM Encryption**: Military-grade encryption for sensitive data
- **PBKDF2 Key Derivation**: 100,000 iterations for key strengthening
- **Salt-based Hashing**: Unique salts for each encryption operation
- **IP and User Agent Tracking**: Complete audit trail
- **Account Lockout**: Protection against brute force attacks

## 📋 API Endpoints

### Password Reset
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

```http
POST /api/auth/verify-reset-token
Content-Type: application/json

{
  "token": "reset_token_here"
}
```

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "new_secure_password",
  "confirmPassword": "new_secure_password"
}
```

### Password Requirements
```http
GET /api/auth/password-requirements
```

## 🎨 Frontend Components

### 1. Forgot Password (`/forgot-password`)
- Email input with validation
- Rate limiting feedback
- Success confirmation with instructions
- Security notices

### 2. Reset Password (`/reset-password?token=...`)
- Token verification
- Password strength validation
- Real-time requirement checking
- Success confirmation with auto-redirect

### 3. Login Integration
- "Forgot Password?" link added to login form
- Seamless user experience

## 🔒 Security Measures

### 1. Token Security
- **Cryptographically Secure**: Uses `crypto.randomBytes(32)`
- **Short Expiry**: 60 minutes maximum
- **Single Use**: Automatically invalidated after use
- **Secure Storage**: Hashed in database

### 2. Rate Limiting
- **Password Reset Requests**: 3 per 15 minutes per IP
- **Reset Attempts**: 5 per 15 minutes per IP
- **Account Lockout**: After 5 failed login attempts

### 3. Encryption
- **Algorithm**: AES-256-GCM
- **Key Derivation**: PBKDF2 with 100,000 iterations
- **Authentication**: Built-in authentication tags
- **Salt**: Unique salt for each operation

### 4. Audit Logging
All security events are logged with:
- User ID and email
- IP address and user agent
- Timestamp and action type
- Success/failure status
- Additional context data

## 📧 Email Templates

### Password Reset Email
- Clear call-to-action button
- Security warnings and instructions
- Expiry time notification
- Fallback URL for accessibility

### Password Reset Confirmation
- Success confirmation
- Security tips
- Login link
- Support contact information

## 🛠️ Database Schema

### Core Tables
- `password_reset_tokens`: Secure token storage
- `account_recovery_tokens`: Multi-purpose recovery tokens
- `credential_backups`: Encrypted credential backups
- `security_audit_log`: Comprehensive audit trail

### User Table Extensions
- `last_password_reset`: Track password changes
- `failed_login_attempts`: Brute force protection
- `account_locked_until`: Temporary lockout
- `recovery_email`: Alternative contact method
- `backup_codes`: Encrypted recovery codes

## 🚨 Emergency Procedures

### 1. User Locked Out
1. Check `security_audit_log` for failed attempts
2. Verify user identity through alternative means
3. Use admin tools to unlock account
4. Generate new backup codes if needed

### 2. Compromised Account
1. Immediately lock account
2. Invalidate all active sessions
3. Force password reset
4. Review audit logs for suspicious activity
5. Regenerate all backup codes

### 3. Lost Encryption Key
1. **CRITICAL**: This will make all encrypted data unrecoverable
2. Generate new encryption key
3. Notify all users to re-authenticate OAuth connections
4. Clear all encrypted credential backups
5. Update documentation with new key

## 🔧 Maintenance

### 1. Token Cleanup
Automated cleanup runs via database function:
```sql
SELECT cleanup_expired_tokens();
```

### 2. Audit Log Rotation
Logs older than 1 year are automatically purged.

### 3. Backup Code Rotation
Users should regenerate backup codes every 90 days.

## 🧪 Testing

### 1. Password Reset Flow
```bash
# Test forgot password
curl -X POST http://localhost:3001/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Test token verification
curl -X POST http://localhost:3001/api/auth/verify-reset-token \
  -H "Content-Type: application/json" \
  -d '{"token":"your_token_here"}'

# Test password reset
curl -X POST http://localhost:3001/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"token":"your_token_here","newPassword":"NewPass123","confirmPassword":"NewPass123"}'
```

### 2. Frontend Testing
1. Navigate to `/forgot-password`
2. Enter email address
3. Check email for reset link
4. Click reset link
5. Enter new password
6. Verify login with new password

## 📞 Support Procedures

### 1. User Cannot Receive Email
1. Check spam/junk folders
2. Verify email address spelling
3. Check email service status
4. Use alternative recovery methods
5. Manual verification if necessary

### 2. Reset Link Not Working
1. Check token expiry (60 minutes)
2. Verify token hasn't been used
3. Check for URL corruption
4. Generate new reset token
5. Clear browser cache/cookies

### 3. Account Recovery
1. Verify user identity
2. Use backup codes if available
3. Check recovery email
4. Manual account recovery process
5. Generate new credentials

## 🔐 Best Practices

### 1. For Users
- Use strong, unique passwords
- Keep backup codes secure
- Set up recovery email
- Monitor account activity
- Report suspicious activity immediately

### 2. For Administrators
- Monitor security audit logs
- Regularly rotate encryption keys
- Keep email templates updated
- Test recovery procedures
- Maintain incident response plan

## 🚀 Deployment Checklist

- [ ] Database migration completed
- [ ] Environment variables configured
- [ ] Encryption key generated and secured
- [ ] Email service configured and tested
- [ ] Frontend components deployed
- [ ] API endpoints tested
- [ ] Security audit log monitoring enabled
- [ ] Backup procedures documented
- [ ] Support team trained
- [ ] Incident response plan updated

## 📊 Monitoring

### Key Metrics to Monitor
- Password reset request volume
- Reset success/failure rates
- Account lockout frequency
- Security audit log alerts
- Email delivery rates
- Token expiry rates

### Alerts to Configure
- High volume of reset requests
- Multiple failed reset attempts
- Account lockout events
- Encryption/decryption failures
- Email delivery failures
- Suspicious IP activity

---

## 🆘 Emergency Contacts

- **Security Team**: security@floworx-iq.com
- **Support Team**: support@floworx-iq.com
- **Development Team**: dev@floworx-iq.com

---

*Last Updated: 2024-09-01*
*Version: 1.0.0*
