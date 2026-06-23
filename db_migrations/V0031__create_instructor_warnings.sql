CREATE TABLE t_p29017774_avn_academy_training.instructor_warnings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  issued_by INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inst_warnings_user_id ON t_p29017774_avn_academy_training.instructor_warnings(user_id);
CREATE INDEX idx_inst_warnings_active ON t_p29017774_avn_academy_training.instructor_warnings(is_active);
