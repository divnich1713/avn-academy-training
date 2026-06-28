CREATE TABLE t_p29017774_avn_academy_training.departments (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  discord_role_id VARCHAR(50),
  leader_role_id VARCHAR(50),
  channel_id VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p29017774_avn_academy_training.ranks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  level INTEGER NOT NULL UNIQUE,
  discord_role_id VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Добавляем колонки в users
ALTER TABLE t_p29017774_avn_academy_training.users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES t_p29017774_avn_academy_training.departments(id) ON DELETE SET NULL;
ALTER TABLE t_p29017774_avn_academy_training.users ADD COLUMN IF NOT EXISTS rank_id INTEGER REFERENCES t_p29017774_avn_academy_training.ranks(id) ON DELETE SET NULL;
ALTER TABLE t_p29017774_avn_academy_training.users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE t_p29017774_avn_academy_training.users ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT '';

-- Расширяем check constraint на роль
ALTER TABLE t_p29017774_avn_academy_training.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE t_p29017774_avn_academy_training.users ADD CONSTRAINT users_role_check CHECK (role IN ('cadet', 'instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'dismissed', 'senior_ufsvng', 'leader', 'admin'));

CREATE TABLE t_p29017774_avn_academy_training.dismissal_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE CASCADE,
  reason VARCHAR(255) NOT NULL,
  comment TEXT,
  photo_url VARCHAR(1024),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p29017774_avn_academy_training.transfers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE CASCADE,
  from_department_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.departments(id) ON DELETE CASCADE,
  to_department_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.departments(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved_by_sender', 'approved_by_receiver', 'approved', 'rejected')),
  sender_leader_id INTEGER REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE SET NULL,
  receiver_leader_id INTEGER REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p29017774_avn_academy_training.warehouse_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  comment TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by INTEGER REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE t_p29017774_avn_academy_training.department_templates (
  id SERIAL PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.departments(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('promotion', 'entry')),
  requirements JSONB NOT NULL,
  min_points INTEGER DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_dismissals_user_id ON t_p29017774_avn_academy_training.dismissal_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON t_p29017774_avn_academy_training.transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_user_id ON t_p29017774_avn_academy_training.warehouse_requests(user_id);

-- Дефолтные звания
INSERT INTO t_p29017774_avn_academy_training.ranks (name, level) VALUES
('Рядовой', 1),
('Ефрейтор', 2),
('Младший Сержант', 3),
('Сержант', 4),
('Старший Сержант', 5),
('Старшина', 6),
('Прапорщик', 7),
('Старший Прапорщик', 8),
('Младший Лейтенант', 9),
('Лейтенант', 10),
('Старший Лейтенант', 11),
('Капитан', 12),
('Майор', 13),
('Подполковник', 14),
('Полковник', 15)
ON CONFLICT (name) DO NOTHING;

-- Дефолтные отделы
INSERT INTO t_p29017774_avn_academy_training.departments (name, description) VALUES
('АВНГ', 'Академия Войск Национальной Гвардии. Обучение и подготовка курсантов.'),
('КОБ', 'Караульно-Огневой Батальон. Охрана важных объектов и патрулирование территории.'),
('ОМОН', 'Отряд Мобильный Особого Назначения. Борьба с беспорядками и силовая поддержка.'),
('СОБР', 'Специальный Отряд Быстрого Реагирования. Освобождение заложников, задержание опасных преступников.'),
('УСБ', 'Управление Собственной Безопасности. Контроль дисциплины и выявление нарушений.'),
('ШТАБ', 'Командный состав и руководство фракции.')
ON CONFLICT (name) DO NOTHING;
