
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
SET password_hash = '$2b$12$TB67/Y1MPmZGn68dAs8irebnGZQBv/DXiV6Tx062OyA8FyxX2S.je'
WHERE email = 'dizelll2007@gmail.com';

-- Verify the update
SELECT id, email, first_name, last_name, email_verified, created_at 
FROM users 
WHERE email = 'dizelll2007@gmail.com';
