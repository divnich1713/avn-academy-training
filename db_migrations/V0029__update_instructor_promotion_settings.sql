DO $$
DECLARE
    settings_row RECORD;
    item jsonb;
    updated_points jsonb := '[]'::jsonb;
    found_18 boolean := false;
BEGIN
    -- Check if table has a row
    SELECT * INTO settings_row FROM t_p29017774_avn_academy_training.instructor_promotion_settings LIMIT 1;
    
    IF FOUND THEN
        -- Table has configuration, let's update specific num configurations
        FOR item IN SELECT * FROM jsonb_array_elements(settings_row.points_config) LOOP
            IF (item->>'num')::int = 10 THEN
                item := jsonb_set(item, '{name}', '"Проведение лекций (дополнительно)"');
                item := jsonb_set(item, '{points}', '10');
            ELSIF (item->>'num')::int = 14 THEN
                item := jsonb_set(item, '{name}', '"Проведение экзамена (дополнительно)"');
                item := jsonb_set(item, '{points}', '15');
            ELSIF (item->>'num')::int = 15 THEN
                item := jsonb_set(item, '{name}', '"Проверка рапорта на повышение (дополнительно)"');
                item := jsonb_set(item, '{points}', '5');
            ELSIF (item->>'num')::int = 17 THEN
                item := jsonb_set(item, '{name}', '"Принятие присяги (дополнительно)"');
                item := jsonb_set(item, '{points}', '10');
            ELSIF (item->>'num')::int = 18 THEN
                found_18 := true;
            END IF;
            updated_points := updated_points || item;
        END LOOP;
        
        -- Add num 18 if not found
        IF NOT found_18 THEN
            updated_points := updated_points || '{"num": 18, "name": "Проведение практики (дополнительно)", "points": 10}'::jsonb;
        END IF;

        -- Update the row
        UPDATE t_p29017774_avn_academy_training.instructor_promotion_settings
        SET points_config = updated_points, updated_at = NOW()
        WHERE id = settings_row.id;
    END IF;
END $$;
