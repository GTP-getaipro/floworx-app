-- Migration: Add Email Verification Fields
-- Description: Add verification token and expiry fields to users table for email verification flow
-- Date: 2025-09-18

-- Add verification token field (nullable, for storing verification tokens)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_token VARCHAR(500);

-- Add verification token expiry field (nullable, for token expiration)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Update existing users to have email_verified = false if not set
UPDATE users
SET email_verified = false
WHERE email_verified IS NULL;

-- Make email_verified NOT NULL with default false
ALTER TABLE users
ALTER COLUMN email_verified SET DEFAULT false;

ALTER TABLE users
ALTER COLUMN email_verified SET NOT NULL;

-- Add index on verification_token for faster lookups during verification
CREATE INDEX IF NOT EXISTS idx_users_verification_token
ON users(verification_token)
WHERE verification_token IS NOT NULL;

-- Add index on email_verified for faster filtering of verified users
CREATE INDEX IF NOT EXISTS idx_users_email_verified
ON users(email_verified);

-- Add index on verification_token_expires_at for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_users_verification_expires
ON users(verification_token_expires_at)
WHERE verification_token_expires_at IS NOT NULL;
