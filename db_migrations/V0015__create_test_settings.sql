-- Migration to create test_settings table and insert initial settings
CREATE TABLE IF NOT EXISTS t_p29017774_avn_academy_training.test_settings (
    id SERIAL PRIMARY KEY,
    subject VARCHAR(255) UNIQUE NOT NULL,
    timer_minutes INTEGER NOT NULL DEFAULT 45,
    question_count INTEGER NOT NULL DEFAULT 30,
    base_elo INTEGER NOT NULL DEFAULT 1000
);

-- Seed initial settings if not present
INSERT INTO t_p29017774_avn_academy_training.test_settings (subject, timer_minutes, question_count, base_elo)
VALUES ('Тест по ФЗ ФСВНГ и уставу ФСВНГ', 45, 30, 1000)
ON CONFLICT (subject) DO NOTHING;
