-- Migration: 0016_jobs_and_portal.sql
-- Jobs table and customer portal: scheduling, status workflow, updates timeline

-- Jobs table (created when quote is accepted)
CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  -- Status workflow
  status text NOT NULL DEFAULT 'pending_schedule'
    CHECK (status IN ('pending_schedule', 'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled')),

  -- Scheduling
  preferred_date date,
  preferred_time_start time,
  preferred_time_end time,
  scheduled_date date,
  scheduled_time time,

  -- Assignment
  assigned_to uuid REFERENCES public.profiles(id),

  -- Completion
  completed_at timestamptz,

  -- Notes
  customer_notes text,
  internal_notes text,

  -- Review tracking
  review_request_sent timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "jobs_select_business" ON public.jobs
  FOR SELECT USING (business_id = get_my_business_id());

CREATE POLICY "jobs_insert_business" ON public.jobs
  FOR INSERT WITH CHECK (business_id = get_my_business_id());

CREATE POLICY "jobs_update_business" ON public.jobs
  FOR UPDATE USING (business_id = get_my_business_id());

CREATE POLICY "jobs_delete_business" ON public.jobs
  FOR DELETE USING (business_id = get_my_business_id());

-- Job updates (timeline of status changes and messages)
CREATE TABLE public.job_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  update_type text NOT NULL CHECK (update_type IN ('status_change', 'message', 'eta_update')),

  -- For status changes
  old_status text,
  new_status text,

  -- For messages
  message text,
  sender_type text CHECK (sender_type IN ('business', 'customer', 'system')),

  -- For ETA updates
  eta_minutes integer,

  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.job_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_updates_select_business" ON public.job_updates
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_my_business_id())
  );

CREATE POLICY "job_updates_insert_business" ON public.job_updates
  FOR INSERT WITH CHECK (
    job_id IN (SELECT id FROM jobs WHERE business_id = get_my_business_id())
  );

-- Indexes
CREATE INDEX idx_jobs_business_id ON public.jobs(business_id);
CREATE INDEX idx_jobs_quote_id ON public.jobs(quote_id);
CREATE INDEX idx_jobs_customer_id ON public.jobs(customer_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_scheduled_date ON public.jobs(scheduled_date);
CREATE INDEX idx_job_updates_job_id ON public.job_updates(job_id);

-- Trigger: set updated_at on jobs
CREATE TRIGGER set_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trigger: Auto-create job when quote is accepted
CREATE OR REPLACE FUNCTION public.create_job_on_accept()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    INSERT INTO public.jobs (business_id, quote_id, customer_id)
    VALUES (NEW.business_id, NEW.id, NEW.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_quote_accepted
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.create_job_on_accept();
