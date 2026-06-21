-- Migration to add last_seen column to the users table
ALTER TABLE t_p29017774_avn_academy_training.users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NULL;
