-- 0004_action_items.sql
--
-- Day 3 of the Meeting Management System Phase 2 build: Action Tracking &
-- Follow-Up. Only the action-tracking half needs schema — the follow-up-
-- scheduling half reuses meetings.previous_meeting_id, added in 0001
-- specifically for this, so there is nothing to migrate for it here.
--
-- action_items is FK'd directly to meetings (meeting_id), not through
-- minutes, so its RLS policies mirror agenda_items/meeting_participants'
-- one-level-join shape from 0001, not minutes_items' two-level-join shape
-- from 0002.
--
-- RLS can't express column-level restrictions, so the UPDATE policy is
-- broad (organizer, admin, or the item's own owner may all attempt an
-- update) and a BEFORE UPDATE trigger does the real column-level fencing:
-- a bare owner (not organizer/admin) may only ever change status. Same
-- division of labor this project already uses for meetings.CANCELLED via
-- trg_protect_booking_columns — RLS for row access, trigger for column
-- protection.

BEGIN;

CREATE TYPE action_item_status AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE');

CREATE TABLE action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  minutes_item_id uuid REFERENCES minutes_items(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  owner_id uuid REFERENCES profiles(id),
  due_date date,
  status action_item_status NOT NULL DEFAULT 'OPEN',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX action_items_meeting_id_idx ON action_items(meeting_id);
CREATE INDEX action_items_minutes_item_id_idx ON action_items(minutes_item_id) WHERE minutes_item_id IS NOT NULL;
CREATE INDEX action_items_owner_status_idx ON action_items(owner_id, status) WHERE owner_id IS NOT NULL;

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY action_items_select_authenticated
  ON action_items FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY action_items_insert_organizer_or_admin
  ON action_items FOR INSERT
  WITH CHECK (
    is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
  );

-- Broad on purpose: organizer, admin, AND owner may all attempt an update.
-- The trigger below is what stops a bare owner from touching anything but
-- status (and the completed_at the trigger derives from it).
CREATE POLICY action_items_update_organizer_admin_or_owner
  ON action_items FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY action_items_delete_organizer_or_admin
  ON action_items FOR DELETE
  USING (
    is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
  );

-- Column-level guard: a bare owner (not organizer/admin) may only change
-- status. Organizer/admin pass through unconditionally.
CREATE OR REPLACE FUNCTION protect_action_item_owner_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  v_is_privileged boolean;
begin
  v_is_privileged := is_admin() OR EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = NEW.meeting_id AND m.booked_by_id = auth.uid()
  );

  if not v_is_privileged then
    if NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.meeting_id IS DISTINCT FROM OLD.meeting_id
       OR NEW.minutes_item_id IS DISTINCT FROM OLD.minutes_item_id
    then
      raise exception 'Only the meeting organizer or an admin can edit action item details.'
        using errcode = 'P0014';
    end if;
  end if;

  if NEW.status = 'DONE' AND OLD.status IS DISTINCT FROM 'DONE' then
    NEW.completed_at := now();
  elsif NEW.status IS DISTINCT FROM 'DONE' then
    NEW.completed_at := NULL;
  end if;

  return NEW;
end;
$function$;

CREATE TRIGGER protect_action_item_owner_updates_before_update
  BEFORE UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION protect_action_item_owner_updates();

-- Must land in the SAME migration as the CREATE TABLE — 0003 exists purely
-- because this step was missed for five tables across 0001/0002.
ALTER PUBLICATION supabase_realtime ADD TABLE action_items;

COMMIT;
