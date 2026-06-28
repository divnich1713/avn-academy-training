-- Session cleanup: add index for expired sessions and schedule periodic cleanup
-- This index optimizes the cleanup query and the auth lookup

-- Composite index for auth lookups (token + expires_at)
CREATE INDEX IF NOT EXISTS idx_sessions_token_expires
    ON t_p29017774_avn_academy_training.sessions(token, expires_at);

-- Delete expired sessions older than 7 days (run periodically)
DELETE FROM t_p29017774_avn_academy_training.sessions
WHERE expires_at < NOW() - INTERVAL '7 days';
