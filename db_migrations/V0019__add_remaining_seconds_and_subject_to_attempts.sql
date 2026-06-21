-- Migration to add remaining_seconds and subject to test_attempts table
ALTER TABLE t_p29017774_avn_academy_training.test_attempts
ADD COLUMN IF NOT EXISTS remaining_seconds INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subject VARCHAR(255) NOT NULL DEFAULT 'Тест по ФЗ ФСВНГ и уставу ФСВНГ';
