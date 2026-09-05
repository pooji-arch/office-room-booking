-- Adds the two new meeting_type values the UI now exposes (Tactical,
-- Strategy) alongside the existing Internal/Other. CLIENT and REVIEW are
-- left in place, unused — no meeting has ever been created with either
-- value (no UI has ever offered them), and Postgres enums can't drop
-- values, so there's nothing to migrate.
ALTER TYPE meeting_type ADD VALUE IF NOT EXISTS 'TACTICAL';
ALTER TYPE meeting_type ADD VALUE IF NOT EXISTS 'STRATEGY';
