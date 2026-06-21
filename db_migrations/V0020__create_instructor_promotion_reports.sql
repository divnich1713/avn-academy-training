CREATE TABLE t_p29017774_avn_academy_training.instructor_promotion_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
  current_rank VARCHAR(100) NOT NULL,
  target_rank VARCHAR(100) NOT NULL,
  total_points INTEGER NOT NULL,
  items_completed JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  instructor_comment TEXT,
  reviewed_by INTEGER REFERENCES t_p29017774_avn_academy_training.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inst_promotion_reports_user_id ON t_p29017774_avn_academy_training.instructor_promotion_reports(user_id);
CREATE INDEX idx_inst_promotion_reports_status ON t_p29017774_avn_academy_training.instructor_promotion_reports(status);
