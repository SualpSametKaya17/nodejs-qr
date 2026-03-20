-- Migration: Add role, cartEnabled, orderingEnabled to restaurants
-- Add parentId (self-relation) to categories
-- Run this script against your MariaDB/MySQL database

-- 1. Add role column to restaurants (default: 'restaurant')
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'restaurant';

-- 2. Add cartEnabled column to restaurants (default: true)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS cartEnabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 3. Add orderingEnabled column to restaurants (default: true)
ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS orderingEnabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 4. Add parentId to categories for hierarchy support
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS parentId INT NULL,
  ADD CONSTRAINT fk_category_parent
    FOREIGN KEY (parentId) REFERENCES categories(id)
    ON DELETE SET NULL;

-- 5. Set superadmin role for existing superadmin accounts (update email as needed)
-- UPDATE restaurants SET role = 'superadmin' WHERE email = 'admin@yourdomain.com';
