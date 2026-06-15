CREATE TABLE IF NOT EXISTS t_p29017774_avn_academy_training.requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
  type VARCHAR(20) NOT NULL CHECK (type IN ('lecture', 'practice', 'exam', 'report')),
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  preferred_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  instructor_comment TEXT,
  reviewed_by INTEGER REFERENCES t_p29017774_avn_academy_training.users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p29017774_avn_academy_training.grades (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
  instructor_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
  request_id INTEGER REFERENCES t_p29017774_avn_academy_training.requests(id),
  subject VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('lecture', 'practice', 'exam')),
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 5),
  comment TEXT,
  graded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_user_id ON t_p29017774_avn_academy_training.requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON t_p29017774_avn_academy_training.requests(status);
CREATE INDEX IF NOT EXISTS idx_grades_user_id ON t_p29017774_avn_academy_training.grades(user_id);
