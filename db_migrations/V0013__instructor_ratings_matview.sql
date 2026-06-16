-- P3-19: Materialized view for instructor ratings summary
-- Replaces the expensive AVG/COUNT/GROUP BY/LEFT JOIN query on every GET /ratings
-- Refresh should be called after INSERT into instructor_ratings or periodically

CREATE MATERIALIZED VIEW IF NOT EXISTS t_p29017774_avn_academy_training.instructor_ratings_summary AS
SELECT
    u.id,
    u.name,
    u.rank,
    u.unit,
    u.role,
    u.discord_id,
    u.avatar_url,
    COALESCE(ROUND(AVG(r.rating)::numeric, 2), 0) as avg_rating,
    COUNT(r.id)::int as rating_count
FROM t_p29017774_avn_academy_training.users u
LEFT JOIN t_p29017774_avn_academy_training.instructor_ratings r ON r.instructor_id = u.id
WHERE u.role IN ('instructor', 'head_avng', 'chief_instructor', 'senior_instructor', 'junior_instructor', 'deputy_head')
GROUP BY u.id, u.name, u.rank, u.unit, u.role, u.discord_id, u.avatar_url;

-- Unique index required for REFRESH CONCURRENTLY
CREATE UNIQUE INDEX IF NOT EXISTS idx_instructor_ratings_summary_id
    ON t_p29017774_avn_academy_training.instructor_ratings_summary (id);
