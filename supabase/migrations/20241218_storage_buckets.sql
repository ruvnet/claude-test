-- Create storage buckets for document management

-- Insert bucket configurations
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, false, 52428800, ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ]),
  ('avatars', 'avatars', true, true, 5242880, ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ]),
  ('logos', 'logos', true, true, 10485760, ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Users can view documents from their organizations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Users can upload documents to their organizations"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Users can update their organization documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Admins can delete organization documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'documents' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
    AND role IN ('owner', 'admin')
  )
);

-- Storage policies for avatars bucket (public read)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage policies for logos bucket (public read)
CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Organization members can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Organization members can update logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
  )
);

CREATE POLICY "Organization admins can delete logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' AND
  auth.uid() IN (
    SELECT user_id FROM organization_members
    WHERE organization_id = (storage.foldername(name))[1]::uuid
    AND role IN ('owner', 'admin')
  )
);

-- Function to generate secure document URLs
CREATE OR REPLACE FUNCTION get_document_url(p_file_path TEXT)
RETURNS TEXT AS $$
DECLARE
  base_url TEXT;
  signed_url TEXT;
BEGIN
  base_url := current_setting('app.settings.supabase_url', true);
  
  -- Generate a signed URL that expires in 1 hour
  signed_url := base_url || '/storage/v1/object/sign/documents/' || p_file_path || '?token=' || 
                encode(hmac(p_file_path || extract(epoch from now() + interval '1 hour')::text, 
                current_setting('app.settings.jwt_secret', true), 'sha256'), 'hex');
  
  RETURN signed_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle file upload metadata
CREATE OR REPLACE FUNCTION handle_storage_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- When a file is uploaded to storage, create a corresponding document record
  IF NEW.bucket_id = 'documents' THEN
    INSERT INTO documents (
      organization_id,
      name,
      file_path,
      file_size,
      mime_type,
      uploaded_by
    ) VALUES (
      (string_to_array(NEW.name, '/'))[1]::uuid,
      (string_to_array(NEW.name, '/'))[array_length(string_to_array(NEW.name, '/'), 1)],
      NEW.name,
      NEW.metadata->>'size',
      NEW.metadata->>'mimetype',
      auth.uid()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for storage uploads
CREATE TRIGGER on_storage_upload
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_storage_upload();