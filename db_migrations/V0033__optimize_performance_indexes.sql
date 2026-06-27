-- V0033: Optimize performance indexes for high-concurrency lookups
-- Composite index for active session/attempts lookup
CREATE INDEX IF NOT EXISTS idx_test_attempts_user_status_opt 
  ON t_p29017774_avn_academy_training.test_attempts (user_id, status);

-- Composite index for checking duplicates inside test_answers
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_test_answers_attempt_question 
  ON t_p29017774_avn_academy_training.test_answers (attempt_id, question_id);

-- Composite index for active instructor warnings lookup
CREATE INDEX IF NOT EXISTS idx_instructor_warnings_user_active_opt 
  ON t_p29017774_avn_academy_training.instructor_warnings (user_id, is_active);
