-- Расширяем таблицу promotion_reports для полноценной системы фракционных повышений

-- Убираем устаревший CHECK constraint на promotion_type
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports DROP CONSTRAINT IF EXISTS promotion_reports_promotion_type_check;

-- Делаем promotion_type nullable (больше не используется напрямую)
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ALTER COLUMN promotion_type DROP NOT NULL;

-- Добавляем новые колонки
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS from_rank VARCHAR(255);
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS to_rank VARCHAR(255);
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS department VARCHAR(255);
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS submitted_by_discord_id VARCHAR(255);
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS points TEXT;
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS links TEXT;
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE t_p29017774_avn_academy_training.promotion_reports ADD COLUMN IF NOT EXISTS reviewed_by_discord_id VARCHAR(255);

-- Составной индекс для быстрого поиска по пользователю + статусу
CREATE INDEX IF NOT EXISTS ix_promotion_reports_user_status ON t_p29017774_avn_academy_training.promotion_reports(user_id, status);
