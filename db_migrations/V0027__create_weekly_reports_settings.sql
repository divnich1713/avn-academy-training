CREATE TABLE t_p29017774_avn_academy_training.weekly_reports_settings (
  id SERIAL PRIMARY KEY,
  points_config JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO t_p29017774_avn_academy_training.weekly_reports_settings (points_config)
VALUES ('{
  "raid": 40,
  "excursion": 20,
  "terror_prevention": 10,
  "global_event": 15,
  "faction_event": 5,
  "supply": 20,
  "robbery_defense": 7,
  "raid_defense": 7,
  "certification": 10,
  "interview": 10,
  "accept_to_unit": 10,
  "promotion_report_check": 10,
  "oath": 5,
  "lecture": 10
}'::jsonb);
