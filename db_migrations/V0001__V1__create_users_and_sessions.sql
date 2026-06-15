CREATE TABLE t_p29017774_avn_academy_training.users (
  id SERIAL PRIMARY KEY,
  static_id VARCHAR(6) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  rank VARCHAR(100) DEFAULT 'Рядовой',
  unit VARCHAR(255) DEFAULT '',
  role VARCHAR(20) NOT NULL DEFAULT 'cadet' CHECK (role IN ('cadet', 'instructor')),
  is_whitelisted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE t_p29017774_avn_academy_training.sessions (
  id SERIAL PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);

INSERT INTO t_p29017774_avn_academy_training.users (static_id, password_hash, name, rank, unit, role, is_whitelisted)
VALUES (
  '819399',
  '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
  'Нач.АВНГ Панрин.А.И.',
  'Полковник',
  'Командный состав',
  'instructor',
  TRUE
) ON CONFLICT (static_id) DO NOTHING;
