CREATE TABLE IF NOT EXISTS t_p29017774_avn_academy_training.instructor_ratings (
    id SERIAL PRIMARY KEY,
    instructor_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
    cadet_id INTEGER NOT NULL REFERENCES t_p29017774_avn_academy_training.users(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (instructor_id, cadet_id)
);