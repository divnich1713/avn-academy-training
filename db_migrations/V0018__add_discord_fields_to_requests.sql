-- Migration to add discord fields to requests table
ALTER TABLE t_p29017774_avn_academy_training.requests
ADD COLUMN IF NOT EXISTS discord_message_id VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discord_channel_id VARCHAR(255) DEFAULT NULL;
