-- Migration: 0018_reviews.sql
-- Review and feedback system

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,

  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,

  -- Moderation
  is_published boolean DEFAULT true,

  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read published reviews (for public quote pages)
CREATE POLICY "reviews_select_published" ON public.reviews
  FOR SELECT USING (is_published = true);

-- Business can see all their reviews (including unpublished)
CREATE POLICY "reviews_select_business" ON public.reviews
  FOR SELECT USING (business_id = get_my_business_id());

-- Add aggregate columns to businesses (denormalized for performance)
ALTER TABLE public.businesses
  ADD COLUMN review_count integer DEFAULT 0,
  ADD COLUMN review_average numeric(2,1) DEFAULT 0;

-- Function to update business review aggregates
CREATE OR REPLACE FUNCTION public.update_business_review_stats()
RETURNS trigger AS $$
DECLARE
  target_business_id uuid;
BEGIN
  -- Get business_id from NEW or OLD depending on operation
  IF TG_OP = 'DELETE' THEN
    target_business_id := OLD.business_id;
  ELSE
    target_business_id := NEW.business_id;
  END IF;

  UPDATE public.businesses SET
    review_count = (SELECT COUNT(*) FROM reviews WHERE business_id = target_business_id AND is_published = true),
    review_average = COALESCE(
      (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE business_id = target_business_id AND is_published = true),
      0
    )
  WHERE id = target_business_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_review_stats();

-- Indexes
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_job_id ON public.reviews(job_id);
CREATE UNIQUE INDEX idx_reviews_unique_job ON public.reviews(job_id); -- One review per job
