-- P1-8: Add missing indexes for frequently queried columns
-- These indexes address slow lookups on sessions auth, notification counts,
-- grade lookups, and request ordering.
-- Note: Not using CONCURRENTLY because Supabase SQL Editor runs in a transaction.

CREATE INDEX IF NOT EXISTS idx_sessions_user_expires 
  ON t_p29017774_avn_academy_training.sessions(user_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON t_p29017774_avn_academy_training.notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
  ON t_p29017774_avn_academy_training.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_grades_instructor 
  ON t_p29017774_avn_academy_training.grades(instructor_id);

CREATE INDEX IF NOT EXISTS idx_grades_request 
  ON t_p29017774_avn_academy_training.grades(request_id);

CREATE INDEX IF NOT EXISTS idx_requests_created 
  ON t_p29017774_avn_academy_training.requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_requests_user 
  ON t_p29017774_avn_academy_training.requests(user_id);
