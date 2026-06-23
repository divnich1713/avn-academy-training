-- Create bucket for instructor evidence
INSERT INTO storage.buckets (id, name, public)
VALUES ('instructor-evidence', 'instructor-evidence', true)
ON CONFLICT (id) DO NOTHING;
