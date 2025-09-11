
# MANUAL PASSWORD RESET INSTRUCTIONS

## Problem
The password reset endpoint is returning a 500 error, likely due to:
- Missing password_reset_tokens table
- Email service not configured
- Database connection issues

## Solution
Manually update the password in the database:

### Step 1: Generate Password Hash
```javascript
const bcrypt = require('bcryptjs');
const password = 'NewPassword123!';
const hash = bcrypt.hashSync(password, 12);
console.log('Hash:', hash);
```

### Step 2: Update Database
```sql
UPDATE users 
SET password_hash = '[GENERATED_HASH]'
WHERE email = 'dizelll2007@gmail.com';
```

### Step 3: Test Login
Try logging in with:
- Email: dizelll2007@gmail.com  
- Password: NewPassword123!

### Step 4: Verify
```sql
SELECT id, email, first_name, email_verified 
FROM users 
WHERE email = 'dizelll2007@gmail.com';
```

## Alternative: Create New Test User
If manual password reset is too complex, create a new test user:
```javascript
// This should work since registration works with other emails
const testEmail = 'test.floworx@gmail.com';
// Register with this email instead
```
