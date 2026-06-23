-- Create bucket for instructor evidence (only if storage schema exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('instructor-evidence', 'instructor-evidence', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
