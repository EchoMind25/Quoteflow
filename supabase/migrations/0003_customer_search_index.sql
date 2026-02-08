-- ============================================================================
-- 0003_customer_search_index.sql
-- Adds pg_trgm extension + GIN index on customers for fast text search.
-- ============================================================================

-- pg_trgm provides trigram-based similarity matching (%> operator, similarity())
create extension if not exists "pg_trgm" schema "extensions";

-- GIN index for trigram-based fuzzy search across name, email, phone, company
-- coalesce() prevents NULL concatenation producing NULL
create index if not exists idx_customers_search_trgm
  on public.customers
  using gin (
    (
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(phone, '') || ' ' ||
      coalesce(company_name, '')
    )
    extensions.gin_trgm_ops
  );
