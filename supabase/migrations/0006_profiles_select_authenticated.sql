-- 0006_profiles_select_authenticated.sql
--
-- Real bug found during prototype-realignment live testing: profiles' SELECT
-- RLS was "id = auth.uid() OR is_admin()" — a non-admin user could only ever
-- see their OWN profile row. Every other table in this schema (meetings,
-- meeting_participants, agenda_items, minutes, minutes_items, action_items)
-- already uses a fully-permissive "auth.role() = 'authenticated'" SELECT
-- policy; profiles was the one outlier.
--
-- This silently broke, for any non-admin organizer, every person-picker
-- (Add Participant, Add Agenda Item owner, Action Item owner) whenever more
-- than one ACTIVE user existed — the picker would only ever show the
-- organizer's own row (or nothing, if they were excluded as the organizer)
-- — and broke participant-name resolution (PostgREST embedded
-- profile:profiles(...) joins are subject to the joined table's own RLS),
-- rendering "Unknown" for any participant/owner who wasn't the current
-- viewer or an admin. This never surfaced in earlier live testing because
-- multi-user picker/name-resolution scenarios were only ever exercised as
-- admin (which bypasses via is_admin()) or with a single active test user.
--
-- No column on profiles is credential-level sensitive (Supabase Auth keeps
-- credentials in auth.users, not here), and every column here (name, email,
-- department, phone) is already the exact data the app's own pickers are
-- designed to surface to any organizer picking a colleague — this migration
-- just makes RLS match what the UI already intends.

BEGIN;

DROP POLICY profiles_select_own_or_admin ON profiles;

CREATE POLICY profiles_select_authenticated
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

COMMIT;
