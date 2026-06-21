-- V0021: Add performance indexes to optimize query latencies.
-- Focuses on session lookups, notification filters, and request lookups.

-- Index for session verification (regular index, since NOW() is not IMMUTABLE)
CREATE INDEX IF NOT EXISTS idx_sessions_token_lookup_opt 
  ON t_p29017774_avn_academy_training.sessions (token);

-- Index for counting unread notifications and fetching lists
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_opt 
  ON t_p29017774_avn_academy_training.notifications (user_id, is_read, created_at DESC);

-- Index for fetching cadet/instructor request lists
CREATE INDEX IF NOT EXISTS idx_requests_lookup_opt 
  ON t_p29017774_avn_academy_training.requests (user_id, status, created_at DESC);
