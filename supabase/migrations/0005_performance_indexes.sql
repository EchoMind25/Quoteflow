-- ============================================================================
-- 0005_performance_indexes.sql
-- Additional indexes for production query performance.
-- ============================================================================

-- Quotes: cursor-based pagination uses (business_id, created_at DESC, id DESC)
-- The idx_quotes_created_at from 0001 covers (business_id, created_at DESC).
-- Add a compound index for cursor queries:
create index if not exists idx_quotes_cursor_pagination
  on public.quotes (business_id, created_at desc, id desc);

-- Quotes: filter by status + date (dashboard stats, status-filtered lists)
create index if not exists idx_quotes_status_created
  on public.quotes (business_id, status, created_at desc);

-- Quotes: public quote lookup by ID + non-draft status (public quote view)
create index if not exists idx_quotes_public_lookup
  on public.quotes (id)
  where status in ('sent', 'viewed', 'accepted', 'declined', 'expired');

-- Line items: sort order for display (sorted line items within a quote)
create index if not exists idx_line_items_sort
  on public.quote_line_items (quote_id, sort_order);

-- Pricing catalog: active items by category (catalog page uses this)
create index if not exists idx_catalog_active_items
  on public.pricing_catalog (business_id, category, title)
  where is_active = true;

-- ============================================================================
-- EXPLAIN ANALYZE Reference Queries
-- Run these against production data to validate index usage.
-- Replace $BIZ with an actual business_id UUID.
-- ============================================================================

-- 1. Quote list (main page, cursor pagination):
--    EXPLAIN ANALYZE
--    SELECT id, title, quote_number, status, total_cents, created_at
--    FROM quotes
--    WHERE business_id = $BIZ
--      AND (created_at, id) < ($CURSOR_TS, $CURSOR_ID)
--    ORDER BY created_at DESC, id DESC
--    LIMIT 21;
--    EXPECTED: Index Scan using idx_quotes_cursor_pagination

-- 2. Quote detail (specific quote with line items):
--    EXPLAIN ANALYZE
--    SELECT id, title, quote_number, status, subtotal_cents, tax_rate,
--           tax_cents, discount_cents, total_cents, notes, customer_notes,
--           expires_at, sent_at, viewed_at, accepted_at, declined_at,
--           created_at, customer_id, created_by
--    FROM quotes
--    WHERE id = $QUOTE_ID AND business_id = $BIZ;
--    EXPECTED: Index Scan using quotes_pkey

-- 3. Line items for a quote:
--    EXPLAIN ANALYZE
--    SELECT id, title, description, quantity, unit, unit_price_cents,
--           line_total_cents, item_type, sort_order, ai_confidence
--    FROM quote_line_items
--    WHERE quote_id = $QUOTE_ID
--    ORDER BY sort_order;
--    EXPECTED: Index Scan using idx_line_items_sort

-- 4. Customer search (trigram):
--    EXPLAIN ANALYZE
--    SELECT id, first_name, last_name, email, phone, company_name
--    FROM customers
--    WHERE business_id = $BIZ
--      AND (
--        coalesce(first_name,'') || ' ' ||
--        coalesce(last_name,'') || ' ' ||
--        coalesce(email,'') || ' ' ||
--        coalesce(phone,'') || ' ' ||
--        coalesce(company_name,'')
--      ) % 'search term'
--    LIMIT 10;
--    EXPECTED: Bitmap Index Scan using idx_customers_search_trgm

-- 5. Dashboard stats (quotes by status for a business):
--    EXPLAIN ANALYZE
--    SELECT status, count(*)
--    FROM quotes
--    WHERE business_id = $BIZ
--    GROUP BY status;
--    EXPECTED: Index Scan using idx_quotes_status_created

-- 6. Public quote lookup:
--    EXPLAIN ANALYZE
--    SELECT id, business_id, customer_id, title, status, total_cents
--    FROM quotes
--    WHERE id = $QUOTE_ID
--      AND status IN ('sent','viewed','accepted','declined','expired');
--    EXPECTED: Index Scan using idx_quotes_public_lookup

-- 7. Catalog items by category:
--    EXPLAIN ANALYZE
--    SELECT id, title, description, category, unit, unit_price_cents
--    FROM pricing_catalog
--    WHERE business_id = $BIZ AND is_active = true
--    ORDER BY category, title;
--    EXPECTED: Index Scan using idx_catalog_active_items
