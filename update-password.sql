
-- SQL to update password for dizelll2007@gmail.com
-- Run this in your database console

-- First, generate the password hash (bcrypt with 12 rounds)
-- You can use this Node.js code to generate the hash:
/*
const bcrypt = require('bcryptjs');
const password = 'NewPassword123!';
const saltRounds = 12;
const hash = bcrypt.hashSync(password, saltRounds);
console.log('Password hash:', hash);
*/

-- Then update the user's password
UPDATE users 
SET password_hash = '$2a$12$[GENERATED_HASH_HERE]'
WHERE email = 'dizelll2007@gmail.com';

-- Verify the update
SELECT id, email, first_name, last_name, email_verified, created_at 
FROM users 
WHERE email = 'dizelll2007@gmail.com';
