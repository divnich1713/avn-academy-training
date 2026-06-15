ALTER TABLE t_p29017774_avn_academy_training.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE t_p29017774_avn_academy_training.users ADD CONSTRAINT users_role_check CHECK (role IN ('cadet', 'instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head', 'dismissed'));
