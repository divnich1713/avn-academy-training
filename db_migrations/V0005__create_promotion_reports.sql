CREATE TABLE t_p29017774_avn_academy_training.promotion_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
  promotion_type VARCHAR(30) NOT NULL CHECK (promotion_type IN ('junior_sergeant', 'sergeant')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  instructor_comment TEXT,
  reviewed_by INTEGER REFERENCES t_p29017774_avn_academy_training.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promotion_reports_user_id ON t_p29017774_avn_academy_training.promotion_reports(user_id);
CREATE INDEX idx_promotion_reports_status ON t_p29017774_avn_academy_training.promotion_reports(status);
