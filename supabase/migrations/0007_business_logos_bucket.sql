-- Create business-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true);

-- Only business owners can upload logos to their own folder
CREATE POLICY "Business owners can upload logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos' AND
    (storage.foldername(name))[1] = (SELECT business_id::text FROM profiles WHERE id = auth.uid())
  );

-- Anyone can view logos (public bucket)
CREATE POLICY "Anyone can view logos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-logos');
