-- 0005_action_item_priority_and_delayed.sql
--
-- Prototype-realignment fix: the confirmed HTML prototype for the Meeting
-- Management System has a Priority field and a 4th action-item status
-- ("Delayed") that Day 3 shipped without. Both are pure additive changes —
-- every existing row gets priority='MEDIUM' by default, and DELAYED is
-- simply a new enum value nothing currently produces.

BEGIN;

ALTER TYPE action_item_status ADD VALUE 'DELAYED';

CREATE TYPE action_item_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');

ALTER TABLE action_items ADD COLUMN priority action_item_priority NOT NULL DEFAULT 'MEDIUM';

-- Re-declare the owner-update guard so a bare owner (not organizer/admin)
-- also cannot change priority — an organizer/admin call, same as
-- title/owner/due_date.
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
       OR NEW.priority IS DISTINCT FROM OLD.priority
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

COMMIT;
