-- 0021_chair_action_item_permissions.sql
--
-- Follow-up to 0020: extends the same Chair content-editing rights to
-- action_items. Deferred out of 0020 specifically because action_items has
-- a companion BEFORE UPDATE trigger (protect_action_item_owner_updates,
-- 0004/0005/0010) doing column-level fencing that RLS alone can't express —
-- confirmed via its live source before writing this, so a Chair isn't left
-- silently downgraded to owner-only partial edits (title/description/
-- owner/due_date/priority locked, and the HIGH-priority DONE sign-off still
-- blocked) even after the RLS policies below let the row through.
--
-- Reuses is_meeting_chair() from 0020 — no new helper needed.
--
-- Notably, 0010's own comment already quotes the Day 3 spec as requiring
-- "organizer/chair sign-off" for a HIGH-priority item's final DONE
-- transition — the trigger just never actually checked for chair, only
-- organizer/admin. This migration is what finally implements that half.

BEGIN;

-- action_items RLS ---------------------------------------------------------

DROP POLICY IF EXISTS action_items_insert_organizer_or_admin ON action_items;
CREATE POLICY action_items_insert_organizer_or_admin
  ON action_items FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(meeting_id)
  );

DROP POLICY IF EXISTS action_items_update_organizer_admin_or_owner ON action_items;
CREATE POLICY action_items_update_organizer_admin_or_owner
  ON action_items FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(meeting_id)
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(meeting_id)
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS action_items_delete_organizer_or_admin ON action_items;
CREATE POLICY action_items_delete_organizer_or_admin
  ON action_items FOR DELETE
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(meeting_id)
  );

-- Column-level guard, re-declared with Chair added to the privileged check.
-- Everything else here is byte-for-byte the live 0010 version.
CREATE OR REPLACE FUNCTION protect_action_item_owner_updates()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
declare
  v_is_privileged boolean;
begin
  v_is_privileged := is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = NEW.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(NEW.meeting_id);

  if not v_is_privileged then
    if NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id
       OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.priority IS DISTINCT FROM OLD.priority
       OR NEW.meeting_id IS DISTINCT FROM OLD.meeting_id
       OR NEW.minutes_item_id IS DISTINCT FROM OLD.minutes_item_id
    then
      raise exception 'Only the meeting organizer, chair, or an admin can edit action item details.'
        using errcode = 'P0014';
    end if;

    if NEW.status = 'DONE' AND OLD.status IS DISTINCT FROM 'DONE' AND OLD.priority = 'HIGH' then
      raise exception 'A High-priority action item needs organizer, chair, or admin sign-off to be marked Done.'
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

COMMIT;
