CREATE TABLE t_p29017774_avn_academy_training.instructor_promotion_settings (
  id SERIAL PRIMARY KEY,
  points_config JSONB NOT NULL,
  ranks_flow JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
