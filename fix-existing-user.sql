-- Fix password for dizelll2007@gmail.com
-- Run this in your Supabase SQL Editor

UPDATE users 
SET password_hash = '$2b$12$DhGx63iWJvAgsWz8ozwA6OLM/A7qR7wUtmcQaubxlfUcopcwRSdUG',
    email_verified = true,
    updated_at = CURRENT_TIMESTAMP
WHERE email = 'dizelll2007@gmail.com';

-- Verify the update
SELECT id, email, first_name, last_name, email_verified, created_at, updated_at
FROM users 
WHERE email = 'dizelll2007@gmail.com';

-- Test the password hash (optional verification)
SELECT 
  email,
  password_hash,
  CASE 
    WHEN password_hash = '$2b$12$DhGx63iWJvAgsWz8ozwA6OLM/A7qR7wUtmcQaubxlfUcopcwRSdUG' THEN 'Password hash matches'
    ELSE 'Password hash different'
  END as hash_status
FROM users 
WHERE email = 'dizelll2007@gmail.com';