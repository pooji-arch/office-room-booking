-- 0002_minutes_of_meeting.sql
--
-- Day 2 of the Meeting Management System Phase 2 build: Minutes of Meeting.
-- Pure additive DDL — CREATE TYPE / CREATE TABLE / RLS only, no ALTER,
-- RENAME, or backfill of existing rows. Unlike Day 1's 0001 migration
-- (which had to edit record_booking_history()'s body because it referenced
-- the renamed table by name, and had to disable triggers for a bulk
-- backfill), nothing here touches an existing table or an existing
-- trigger/function body — confirmed by inspecting every trigger/function in
-- 0001 and finding none reference "minutes"/"minutes_items"/
-- "minutes_revisions" in any way, since those tables didn't exist yet.
--
-- Deliberately NOT adding a "block writes once FINAL" trigger/constraint:
-- unlike meetings.CANCELLED (a genuinely terminal state enforced by
-- trg_protect_booking_columns), minutes.FINAL is designed to remain
-- editable later — minutes_revisions exists specifically so a future day
-- can let an organizer/admin edit finalized minutes and log why. A hard
-- DB-level immutability guard today would just have to be removed later.

BEGIN;

-- ============================================================
-- 1. New enum (no collision, confirmed live before writing this file)
-- ============================================================
CREATE TYPE minutes_status AS ENUM ('DRAFT', 'FINAL');

-- ============================================================
-- 2. minutes — one row per meeting (enforced by UNIQUE meeting_id)
-- ============================================================
CREATE TABLE minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL UNIQUE REFERENCES meetings(id) ON DELETE CASCADE,
  status minutes_status NOT NULL DEFAULT 'DRAFT',
  finalized_by uuid REFERENCES profiles(id),
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE minutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY minutes_select_authenticated
  ON minutes FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY minutes_insert_organizer_or_admin
  ON minutes FOR INSERT
  WITH CHECK (
    is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
  );

CREATE POLICY minutes_update_organizer_or_admin
  ON minutes FOR UPDATE
  USING (is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()))
  WITH CHECK (is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()));

CREATE POLICY minutes_delete_organizer_or_admin
  ON minutes FOR DELETE
  USING (is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid()));

-- ============================================================
-- 3. minutes_items — the actual MOM entries
-- ============================================================
CREATE TABLE minutes_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id uuid NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  topic text NOT NULL,
  notes text NOT NULL,
  decision text,
  agenda_item_id uuid REFERENCES agenda_items(id) ON DELETE SET NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX minutes_items_minutes_id_idx ON minutes_items(minutes_id);
CREATE INDEX minutes_items_agenda_item_id_idx ON minutes_items(agenda_item_id) WHERE agenda_item_id IS NOT NULL;

ALTER TABLE minutes_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY minutes_items_select_authenticated
  ON minutes_items FOR SELECT
  USING (auth.role() = 'authenticated');

-- Joins through minutes to reach meetings.booked_by_id — one more level of
-- indirection than agenda_items/meeting_participants needed in 0001.
CREATE POLICY minutes_items_insert_organizer_or_admin
  ON minutes_items FOR INSERT
  WITH CHECK (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  );

CREATE POLICY minutes_items_update_organizer_or_admin
  ON minutes_items FOR UPDATE
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  );

CREATE POLICY minutes_items_delete_organizer_or_admin
  ON minutes_items FOR DELETE
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  );

-- ============================================================
-- 4. minutes_revisions — post-finalization edit trail (schema only;
--    nothing in Day 2's UI writes to this table yet — the edit-existing-
--    entry flow that would populate it is out of scope this sprint).
-- ============================================================
CREATE TABLE minutes_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes_id uuid NOT NULL REFERENCES minutes(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL,
  change_summary text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX minutes_revisions_minutes_id_idx ON minutes_revisions(minutes_id);

ALTER TABLE minutes_revisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY minutes_revisions_select_authenticated
  ON minutes_revisions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY minutes_revisions_insert_organizer_or_admin
  ON minutes_revisions FOR INSERT
  WITH CHECK (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  );

CREATE POLICY minutes_revisions_update_organizer_or_admin
  ON minutes_revisions FOR UPDATE
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  )
  WITH CHECK (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  );

CREATE POLICY minutes_revisions_delete_organizer_or_admin
  ON minutes_revisions FOR DELETE
  USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_id AND m.booked_by_id = auth.uid()
    )
  );

COMMIT;
