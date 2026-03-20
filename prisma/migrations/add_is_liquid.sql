-- Migration: Add isLiquid column to menu_items
-- Sıvı ürünler için görsel dalga efekti desteği

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS isLiquid BOOLEAN NOT NULL DEFAULT FALSE;
