-- Migration to add instructor_id column to requests table
ALTER TABLE t_p29017774_avn_academy_training.requests
ADD COLUMN IF NOT EXISTS instructor_id INTEGER REFERENCES t_p29017774_avn_academy_training.users(id) DEFAULT NULL;
