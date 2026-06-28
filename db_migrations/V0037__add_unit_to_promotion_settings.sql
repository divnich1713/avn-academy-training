ALTER TABLE t_p29017774_avn_academy_training.instructor_promotion_settings 
ADD COLUMN unit VARCHAR(50) DEFAULT 'АВНГ';

UPDATE t_p29017774_avn_academy_training.instructor_promotion_settings
SET unit = 'АВНГ'
WHERE unit IS NULL;

ALTER TABLE t_p29017774_avn_academy_training.instructor_promotion_settings
ADD CONSTRAINT unique_instructor_promotion_settings_unit UNIQUE (unit);
