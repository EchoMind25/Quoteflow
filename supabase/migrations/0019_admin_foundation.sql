-- ============================================
-- ADMIN ACCESS
-- ============================================

-- Add admin flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN is_admin boolean DEFAULT false;

-- Admin check function (SECURITY DEFINER for RLS)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ============================================
-- ADMIN AUDIT LOGS (what admins do)
-- ============================================

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES public.profiles(id),
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_admin_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_created_at ON admin_audit_logs(created_at DESC);

-- ============================================
-- SYSTEM METRICS (aggregated, no PII)
-- ============================================

CREATE TABLE public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date date NOT NULL,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),

  UNIQUE(metric_date, metric_type)
);

CREATE INDEX idx_system_metrics_date ON system_metrics(metric_date DESC);
CREATE INDEX idx_system_metrics_type ON system_metrics(metric_type);

-- ============================================
-- API COST TRACKING
-- ============================================

CREATE TABLE public.api_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cost_date date NOT NULL,
  provider text NOT NULL,
  operation text NOT NULL,
  request_count integer DEFAULT 0,
  token_count integer DEFAULT 0,
  cost_cents integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),

  UNIQUE(cost_date, provider, operation)
);

CREATE INDEX idx_api_costs_date ON api_costs(cost_date DESC);
CREATE INDEX idx_api_costs_provider ON api_costs(provider);

-- Atomic cost increment
CREATE OR REPLACE FUNCTION public.increment_api_cost(
  p_cost_date date,
  p_provider text,
  p_operation text,
  p_request_count integer,
  p_token_count integer,
  p_cost_cents integer
)
RETURNS void AS $$
BEGIN
  INSERT INTO api_costs (cost_date, provider, operation, request_count, token_count, cost_cents)
  VALUES (p_cost_date, p_provider, p_operation, p_request_count, p_token_count, p_cost_cents)
  ON CONFLICT (cost_date, provider, operation)
  DO UPDATE SET
    request_count = api_costs.request_count + p_request_count,
    token_count = api_costs.token_count + p_token_count,
    cost_cents = api_costs.cost_cents + p_cost_cents;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ERROR LOGS (sanitized)
-- ============================================

CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_hash text NOT NULL,
  error_type text NOT NULL,
  error_message text NOT NULL,
  route text,
  method text,
  status_code integer,
  stack_trace text,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  occurrence_count integer DEFAULT 1,
  is_resolved boolean DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES profiles(id),
  resolution_notes text,
  severity text DEFAULT 'error' CHECK (severity IN ('warning', 'error', 'critical'))
);

CREATE INDEX idx_error_logs_hash ON error_logs(error_hash);
CREATE INDEX idx_error_logs_type ON error_logs(error_type);
CREATE INDEX idx_error_logs_resolved ON error_logs(is_resolved);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);
CREATE INDEX idx_error_logs_last_seen ON error_logs(last_seen_at DESC);

-- ============================================
-- FEATURE FLAGS
-- ============================================

CREATE TABLE public.feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text UNIQUE NOT NULL,
  flag_name text NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  rollout_percentage integer DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  target_industries text[],
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_feature_flags_key ON feature_flags(flag_key);

-- ============================================
-- INCIDENTS (for status page)
-- ============================================

CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_number serial,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'investigating'
    CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
  severity text NOT NULL DEFAULT 'minor'
    CHECK (severity IN ('minor', 'major', 'critical')),
  affected_components text[] DEFAULT '{}',
  started_at timestamptz NOT NULL DEFAULT now(),
  identified_at timestamptz,
  resolved_at timestamptz,
  is_public boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  updated_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.incident_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status text NOT NULL,
  message text NOT NULL,
  is_public boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_public ON incidents(is_public, status);
CREATE INDEX idx_incident_updates_incident ON incident_updates(incident_id);

-- ============================================
-- SCHEDULED MAINTENANCE
-- ============================================

CREATE TABLE public.scheduled_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  affected_components text[] DEFAULT '{}',
  is_full_outage boolean DEFAULT false,
  show_banner boolean DEFAULT true,
  banner_message text,
  status text DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_maintenance_status ON scheduled_maintenance(status);
CREATE INDEX idx_maintenance_dates ON scheduled_maintenance(scheduled_start, scheduled_end);

-- ============================================
-- SITE SETTINGS
-- ============================================

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  updated_by uuid REFERENCES profiles(id),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO site_settings (key, value, description) VALUES
  ('maintenance_mode', 'false', 'Enable site-wide maintenance mode'),
  ('maintenance_message', '"We are performing scheduled maintenance. Please check back soon."', 'Message shown during maintenance'),
  ('registration_enabled', 'true', 'Allow new user registrations'),
  ('ai_generation_enabled', 'true', 'Enable AI quote generation'),
  ('max_photos_per_quote', '10', 'Maximum photos allowed per quote'),
  ('max_voice_duration_seconds', '300', 'Maximum voice recording duration');

-- ============================================
-- SUPPORT TICKETS (minimal PII)
-- ============================================

CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number serial,
  requester_hash text NOT NULL,
  requester_type text DEFAULT 'user' CHECK (requester_type IN ('user', 'anonymous')),
  category text NOT NULL CHECK (category IN (
    'billing', 'technical', 'account', 'feature_request', 'bug_report', 'other'
  )),
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
  sender_id uuid,
  message_content text NOT NULL,
  attachment_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_category ON support_tickets(category);
CREATE INDEX idx_support_messages_ticket ON support_messages(ticket_id);

-- ============================================
-- RATE LIMIT VIOLATIONS (for abuse monitoring)
-- ============================================

CREATE TABLE public.rate_limit_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_hash text NOT NULL,
  identifier_type text NOT NULL,
  limit_type text NOT NULL,
  limit_value integer NOT NULL,
  request_count integer NOT NULL,
  is_suspicious boolean DEFAULT false,
  suspicion_reason text,
  occurred_at timestamptz DEFAULT now()
);

CREATE INDEX idx_rate_violations_hash ON rate_limit_violations(identifier_hash);
CREATE INDEX idx_rate_violations_type ON rate_limit_violations(limit_type);
CREATE INDEX idx_rate_violations_suspicious ON rate_limit_violations(is_suspicious);
CREATE INDEX idx_rate_violations_occurred ON rate_limit_violations(occurred_at DESC);

-- ============================================
-- HEALTH CHECK RESULTS
-- ============================================

CREATE TABLE public.health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  check_type text NOT NULL,
  is_healthy boolean NOT NULL,
  response_time_ms integer,
  error_message text,
  checked_at timestamptz DEFAULT now()
);

CREATE INDEX idx_health_checks_service ON health_checks(service_name);
CREATE INDEX idx_health_checks_checked ON health_checks(checked_at DESC);

CREATE OR REPLACE FUNCTION public.cleanup_old_health_checks()
RETURNS void AS $$
BEGIN
  DELETE FROM health_checks WHERE checked_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AGGREGATE RPC FUNCTIONS (no PII)
-- ============================================

-- User growth by month
CREATE OR REPLACE FUNCTION public.get_user_growth_by_month()
RETURNS TABLE(month date, new_users bigint, total_users bigint) AS $$
  SELECT
    date_trunc('month', created_at)::date as month,
    COUNT(*) as new_users,
    SUM(COUNT(*)) OVER (ORDER BY date_trunc('month', created_at)) as total_users
  FROM profiles
  WHERE created_at >= now() - interval '12 months'
  GROUP BY date_trunc('month', created_at)
  ORDER BY month;
$$ LANGUAGE sql SECURITY DEFINER;

-- Average quote production time
CREATE OR REPLACE FUNCTION public.get_avg_quote_production_time()
RETURNS TABLE(avg_seconds numeric) AS $$
  SELECT
    ROUND(AVG(EXTRACT(EPOCH FROM (sent_at - created_at)))) as avg_seconds
  FROM quotes
  WHERE sent_at IS NOT NULL
    AND sent_at > now() - interval '30 days'
    AND EXTRACT(EPOCH FROM (sent_at - created_at)) < 3600;
$$ LANGUAGE sql SECURITY DEFINER;

-- Daily active businesses
CREATE OR REPLACE FUNCTION public.get_daily_active_businesses()
RETURNS TABLE(date date, active_count bigint, avg_daily numeric) AS $$
  WITH daily AS (
    SELECT
      DATE(created_at) as date,
      COUNT(DISTINCT business_id) as active_count
    FROM activity_logs
    WHERE created_at >= now() - interval '30 days'
    GROUP BY DATE(created_at)
  )
  SELECT
    date,
    active_count,
    ROUND(AVG(active_count) OVER (), 1) as avg_daily
  FROM daily
  ORDER BY date;
$$ LANGUAGE sql SECURITY DEFINER;

-- AI usage stats
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats()
RETURNS TABLE(ai_count bigint, manual_count bigint, ai_percentage numeric) AS $$
  SELECT
    COUNT(*) FILTER (WHERE voice_transcript IS NOT NULL) as ai_count,
    COUNT(*) FILTER (WHERE voice_transcript IS NULL) as manual_count,
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE voice_transcript IS NOT NULL) / NULLIF(COUNT(*), 0),
      1
    ) as ai_percentage
  FROM quotes
  WHERE created_at >= now() - interval '30 days';
$$ LANGUAGE sql SECURITY DEFINER;
