ALTER TABLE t_p29017774_avn_academy_training.grades
ADD COLUMN IF NOT EXISTS instructor_promo_used BOOLEAN DEFAULT FALSE;

ALTER TABLE t_p29017774_avn_academy_training.promotion_reports
ADD COLUMN IF NOT EXISTS instructor_promo_used BOOLEAN DEFAULT FALSE;
