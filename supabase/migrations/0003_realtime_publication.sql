-- 0003_realtime_publication.sql
--
-- Fixes a gap discovered during Day 2's live dual-tab realtime verification:
-- only "meetings" was ever added to the supabase_realtime publication.
-- meeting_participants and agenda_items (added in 0001) and minutes/
-- minutes_items/minutes_revisions (added in 0002) all have postgres_changes
-- subscriptions wired up in the frontend (useMeetingsRealtime.ts), but
-- Postgres never emitted replication events for them because they were
-- never added to the publication — those subscriptions were silent no-ops.

BEGIN;

ALTER PUBLICATION supabase_realtime ADD TABLE
  meeting_participants,
  agenda_items,
  minutes,
  minutes_items,
  minutes_revisions;

COMMIT;
