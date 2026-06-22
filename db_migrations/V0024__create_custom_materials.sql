-- Migration to create custom_materials table for storing flashcards and scenarios
CREATE TABLE IF NOT EXISTS t_p29017774_avn_academy_training.custom_materials (
  id SERIAL PRIMARY KEY,
  material_type VARCHAR(50) NOT NULL UNIQUE,
  data JSONB NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
