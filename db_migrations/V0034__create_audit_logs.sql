CREATE TABLE IF NOT EXISTS t_p29017774_avn_academy_training.audit_logs (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER REFERENCES t_p29017774_avn_academy_training.users(id) ON DELETE SET NULL,
    operator_name VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_id VARCHAR(100),
    target_name VARCHAR(255),
    details JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON t_p29017774_avn_academy_training.audit_logs(created_at DESC);
