CREATE TABLE t_p29017774_avn_academy_training.weekly_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- Дата понедельника отчетной недели
  items JSONB NOT NULL,     -- JSON объект с количеством и ссылками на док-ва для каждого пункта
  total_points INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_comment TEXT,
  reviewed_by INTEGER REFERENCES t_p29017774_avn_academy_training.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start)
);

CREATE INDEX idx_weekly_reports_user_id ON t_p29017774_avn_academy_training.weekly_reports(user_id);
CREATE INDEX idx_weekly_reports_week_start ON t_p29017774_avn_academy_training.weekly_reports(week_start);
CREATE INDEX idx_weekly_reports_status ON t_p29017774_avn_academy_training.weekly_reports(status);
