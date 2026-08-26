-- 0001_meetings_and_organization.sql
--
-- Day 1 of the Meeting Management System Phase 2 build: turns the existing
-- Room/Resource Booking module into the foundation for real meetings —
-- extending the `bookings` table in place (rename + new columns) rather than
-- creating a second, parallel table, so the existing overlap-prevention
-- constraint, history trail, and status logic keep working unchanged.
--
-- This is the first file in supabase/migrations/ for this project. Every
-- prior schema change was applied ad hoc via a `pg` client script with
-- nothing checked in — going forward, schema changes should land as new
-- numbered files in this folder.
--
-- Verified directly against the live database before writing this file
-- (see the verification queries run alongside this migration): the
-- `no_overlapping_bookings` EXCLUDE constraint, all RLS policies, and every
-- trigger except `record_booking_history_after_update` survive the table
-- rename with no changes needed, since Postgres tracks them by OID, not by
-- table name. Only `record_booking_history()`'s function body needs editing,
-- because it contains a literal `INSERT INTO booking_history` — a rename
-- does not rewrite table-name strings inside function bodies.
--
-- Confirmed backfill hazard: `trg_protect_booking_columns` (BEFORE UPDATE,
-- unconditional) raises "This booking has already been cancelled." for ANY
-- update to an already-CANCELLED row, regardless of which column changes —
-- so the title backfill below must run with that trigger disabled, or it
-- aborts on the first cancelled historical row. `validate_booking_schedule_
-- before_update` only fires when date/start_time/end_time change (confirmed
-- via its WHEN clause) so a title-only update wouldn't trip it anyway, but
-- it's disabled too for the same statement as a zero-cost safety margin.

BEGIN;

-- ============================================================
-- 1. New enum types (none collide with existing types, confirmed)
-- ============================================================
CREATE TYPE meeting_type AS ENUM ('INTERNAL', 'CLIENT', 'REVIEW', 'OTHER');
CREATE TYPE meeting_participant_role AS ENUM ('CHAIR', 'PARTICIPANT');
CREATE TYPE meeting_rsvp_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'TENTATIVE');

-- ============================================================
-- 2. Rename bookings -> meetings, booking_history -> meeting_history.
--    Safe: constraints (incl. the EXCLUDE constraint), triggers, indexes,
--    foreign keys, and RLS policies all follow by OID, not by name.
-- ============================================================
ALTER TABLE bookings RENAME TO meetings;
ALTER TABLE booking_history RENAME TO meeting_history;
ALTER TABLE meeting_history RENAME COLUMN booking_id TO meeting_id;

-- ============================================================
-- 3. New columns + relax attendees on meetings
-- ============================================================
ALTER TABLE meetings
  ADD COLUMN title text,
  ADD COLUMN type meeting_type NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN department text,
  ADD COLUMN review_date date,
  ADD COLUMN previous_meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL;

ALTER TABLE meetings ALTER COLUMN attendees DROP NOT NULL;

CREATE INDEX meetings_previous_meeting_id_idx
  ON meetings(previous_meeting_id) WHERE previous_meeting_id IS NOT NULL;

-- ============================================================
-- 4. Backfill title from purpose for existing rows.
--    trg_protect_booking_columns must be disabled first (see header note) —
--    it unconditionally rejects any update to an already-cancelled row.
--    validate_booking_schedule_before_update is disabled too, defensively,
--    though its own WHEN clause means it would not fire for this statement.
--    title stays NULLABLE going forward; the app always sets it on create.
-- ============================================================
ALTER TABLE meetings DISABLE TRIGGER trg_protect_booking_columns;
ALTER TABLE meetings DISABLE TRIGGER validate_booking_schedule_before_update;

UPDATE meetings SET title = purpose WHERE title IS NULL;

ALTER TABLE meetings ENABLE TRIGGER trg_protect_booking_columns;
ALTER TABLE meetings ENABLE TRIGGER validate_booking_schedule_before_update;

-- ============================================================
-- 5. Fix record_booking_history(): it INSERTs into booking_history by name,
--    which the table rename above does not rewrite. Renamed to
--    record_meeting_history() at the same time since the body edit is
--    already required — the trigger below is repointed to match, and
--    renamed too for the same reason. No other function referenced
--    "bookings"/"booking_history" by name (set_booking_code() uses a
--    sequence, not the table; set_booking_snapshots(), validate_booking_
--    schedule(), and protect_booking_columns() only ever inspect NEW/OLD of
--    whatever row fired them) — confirmed by reading every one of their
--    bodies against the live database, not assumed.
-- ============================================================
DROP TRIGGER record_booking_history_after_update ON meetings;

CREATE OR REPLACE FUNCTION record_meeting_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_changed_by uuid := auth.uid();
  v_changed_by_name text;
  v_is_admin boolean := is_admin();
  v_reason text;
begin
  if v_changed_by is not null then
    select p.name into v_changed_by_name from public.profiles p where p.id = v_changed_by;
  end if;
  v_changed_by_name := coalesce(v_changed_by_name, 'System');

  if NEW.reassigned_at is distinct from OLD.reassigned_at then
    v_reason := NEW.reassignment_reason;
  else
    v_reason := null;
  end if;

  insert into public.meeting_history (
    meeting_id,
    previous_room_id, previous_room_name, previous_room_location,
    previous_date, previous_start_time, previous_end_time,
    new_room_id, new_room_name, new_room_location,
    new_date, new_start_time, new_end_time,
    reason, changed_by_is_admin, changed_by, changed_by_name
  ) values (
    NEW.id,
    OLD.room_id, OLD.room_name, OLD.room_location, OLD.date, OLD.start_time, OLD.end_time,
    NEW.room_id, NEW.room_name, NEW.room_location, NEW.date, NEW.start_time, NEW.end_time,
    v_reason, v_is_admin, v_changed_by, v_changed_by_name
  );

  return NEW;
end;
$function$;

DROP FUNCTION record_booking_history();

CREATE TRIGGER record_meeting_history_after_update
  AFTER UPDATE ON meetings
  FOR EACH ROW
  WHEN (
    (old.room_id IS DISTINCT FROM new.room_id) OR
    (old.date IS DISTINCT FROM new.date) OR
    (old.start_time IS DISTINCT FROM new.start_time) OR
    (old.end_time IS DISTINCT FROM new.end_time)
  )
  EXECUTE FUNCTION record_meeting_history();

-- ============================================================
-- 6. meeting_participants
-- ============================================================
CREATE TABLE meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id),
  external_name text,
  external_email text,
  external_organization text,
  role meeting_participant_role NOT NULL DEFAULT 'PARTICIPANT',
  rsvp_status meeting_rsvp_status NOT NULL DEFAULT 'PENDING',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meeting_participants_identity_check
    CHECK (profile_id IS NOT NULL OR external_email IS NOT NULL),
  CONSTRAINT meeting_participants_unique_profile UNIQUE (meeting_id, profile_id)
);

CREATE INDEX meeting_participants_meeting_id_idx ON meeting_participants(meeting_id);
CREATE INDEX meeting_participants_profile_id_idx ON meeting_participants(profile_id)
  WHERE profile_id IS NOT NULL;

ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

-- Mirrors bookings_select_authenticated's exact expression, confirmed live.
CREATE POLICY meeting_participants_select_authenticated
  ON meeting_participants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY meeting_participants_insert_organizer_or_admin
  ON meeting_participants FOR INSERT
  WITH CHECK (
    is_admin() OR EXISTS (
      SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()
    )
  );

CREATE POLICY meeting_participants_update_organizer_or_admin
  ON meeting_participants FOR UPDATE
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin() OR EXISTS (
      SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()
    )
  );

CREATE POLICY meeting_participants_delete_organizer_or_admin
  ON meeting_participants FOR DELETE
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()
    )
  );

-- ============================================================
-- 7. agenda_items (schema only this sprint — UI ships alongside
--    Minutes of Meeting)
-- ============================================================
CREATE TABLE agenda_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  topic text NOT NULL,
  owner_id uuid REFERENCES profiles(id),
  allotted_minutes integer NOT NULL DEFAULT 10,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX agenda_items_meeting_id_idx ON agenda_items(meeting_id);

ALTER TABLE agenda_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY agenda_items_select_authenticated
  ON agenda_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY agenda_items_insert_organizer_or_admin
  ON agenda_items FOR INSERT
  WITH CHECK (
    is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
  );

CREATE POLICY agenda_items_update_organizer_or_admin
  ON agenda_items FOR UPDATE
  USING (is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()))
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()));

CREATE POLICY agenda_items_delete_organizer_or_admin
  ON agenda_items FOR DELETE
  USING (is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()));

COMMIT;
