-- Migration: Add banner_url column to app_users table
-- Date: 2026-01-01
-- Description: Adds banner customization to user profiles

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS banner_url TEXT;

-- Optional: Add index for faster lookups if needed
-- CREATE INDEX IF NOT EXISTS idx_app_users_banner ON app_users(banner_url) WHERE banner_url IS NOT NULL;
