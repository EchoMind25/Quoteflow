-- Migration: 0017_deposits.sql
-- Deposit collection via Stripe Connect

-- Add Stripe account and deposit settings to businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS stripe_account_id text,
  ADD COLUMN deposit_required boolean DEFAULT false,
  ADD COLUMN deposit_type text DEFAULT 'percentage' CHECK (deposit_type IN ('percentage', 'fixed')),
  ADD COLUMN deposit_amount integer DEFAULT 25; -- 25% or $25.00 depending on type

-- Add deposit tracking to jobs
ALTER TABLE public.jobs
  ADD COLUMN deposit_amount_cents integer,
  ADD COLUMN deposit_paid boolean DEFAULT false,
  ADD COLUMN deposit_paid_at timestamptz,
  ADD COLUMN stripe_payment_intent_id text;
