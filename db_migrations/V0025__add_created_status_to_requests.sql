-- Migration to add 'created' status to requests table status check constraint
ALTER TABLE t_p29017774_avn_academy_training.requests DROP CONSTRAINT IF EXISTS requests_status_check;
ALTER TABLE t_p29017774_avn_academy_training.requests ADD CONSTRAINT requests_status_check CHECK (status IN ('created', 'pending', 'approved', 'rejected'));
ALTER TABLE t_p29017774_avn_academy_training.requests ALTER COLUMN status SET DEFAULT 'created';
