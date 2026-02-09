-- Migration: Add roofing and landscaping to industry_type enum
-- Extends industry coverage for AI quote generation pipeline.

ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'roofing';
ALTER TYPE public.industry_type ADD VALUE IF NOT EXISTS 'landscaping';

COMMENT ON TYPE public.industry_type IS
  'Supported industries: hvac, plumbing, electrical, roofing, landscaping, general';
