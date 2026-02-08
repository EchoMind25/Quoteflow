-- Create business-logos storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true,  -- logos must be publicly accessible
  2097152,  -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Business owners can upload to their business_id folder
CREATE POLICY "business_logos_upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'business-logos' AND
    -- Path format: {business_id}/logo.png
    (storage.foldername(name))[1] = (
      SELECT business_id::text FROM profiles WHERE id = auth.uid()
    )
  );

-- Anyone can view logos (public bucket)
CREATE POLICY "business_logos_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'business-logos');

-- Owners can delete their own logos
CREATE POLICY "business_logos_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'business-logos' AND
    (storage.foldername(name))[1] = (
      SELECT business_id::text FROM profiles WHERE id = auth.uid()
    )
  );
