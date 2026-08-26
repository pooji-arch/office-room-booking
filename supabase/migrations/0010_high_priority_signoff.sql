-- 0010_high_priority_signoff.sql
--
-- Day 4 finding, proven live: logged in as an action item's own owner
-- (neither the meeting's organizer nor an admin) and PATCHed a HIGH-priority
-- item straight to DONE via a direct REST call — it succeeded (200, row
-- updated). The Day 3 spec is explicit this shouldn't be possible: "An owner
-- marking their own High-priority item Completed is not enough alone —
-- requires organizer/chair sign-off before it counts as closed." Nothing in
-- 0004/0005 ever implemented this half of the rule.
--
-- Extends protect_action_item_owner_updates() (0004/0005) rather than a new
-- trigger, since it already carries the exact "is this caller privileged"
-- check this rule needs — a HIGH item's final DONE transition now has to be
-- performed by the organizer or an admin, not merely permitted by them.
-- Owners keep the ability to move a HIGH item through OPEN/IN_PROGRESS/
-- DELAYED freely; only the DONE transition needs sign-off, matching "the
-- owner marking it complete alone isn't enough" (not "the owner can't touch
-- it at all").

BEGIN;

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

    if NEW.status = 'DONE' AND OLD.status IS DISTINCT FROM 'DONE' AND OLD.priority = 'HIGH' then
      raise exception 'A High-priority action item needs organizer or admin sign-off to be marked Done.'
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
