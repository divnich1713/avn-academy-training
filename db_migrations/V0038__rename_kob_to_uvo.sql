-- Safe rename of КОБ to УВО in departments table
DO $$
DECLARE
    uvo_id INT;
    kob_id INT;
BEGIN
    SELECT id INTO uvo_id FROM t_p29017774_avn_academy_training.departments WHERE name = 'УВО';
    SELECT id INTO kob_id FROM t_p29017774_avn_academy_training.departments WHERE name = 'КОБ';
    
    IF uvo_id IS NOT NULL AND kob_id IS NOT NULL THEN
        -- Merge users belonging to KOB to UVO
        UPDATE t_p29017774_avn_academy_training.users SET department_id = uvo_id WHERE department_id = kob_id;
        -- Delete KOB department
        DELETE FROM t_p29017774_avn_academy_training.departments WHERE id = kob_id;
    ELSIF kob_id IS NOT NULL THEN
        -- Rename KOB to UVO
        UPDATE t_p29017774_avn_academy_training.departments
        SET name = 'УВО', description = 'Управление Вневедомственной Охраны. Охрана важных объектов и патрулирование территории.'
        WHERE id = kob_id;
    END IF;
END $$;

-- Safe rename of КОБ to УВО in instructor_promotion_settings table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM t_p29017774_avn_academy_training.instructor_promotion_settings WHERE unit = 'УВО') THEN
        -- If both exist, delete the КОБ one (to avoid unique constraint violation)
        DELETE FROM t_p29017774_avn_academy_training.instructor_promotion_settings WHERE unit = 'КОБ';
    ELSE
        UPDATE t_p29017774_avn_academy_training.instructor_promotion_settings
        SET unit = 'УВО'
        WHERE unit = 'КОБ';
    END IF;
END $$;
