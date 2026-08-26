-- 0012_lock_cancelled_meetings.sql
--
-- Day 7 finding, proven live (not assumed): a cancelled meeting could still
-- have agenda items, participants, and action items added to it via direct
-- REST calls (all three tested, all three succeeded with 201). This
-- violates the PRD's explicit "a cancelled meeting should be fully locked"
-- edge case (Section 12, prototype rule) — meetings.status = 'CANCELLED' is
-- meant to be terminal, matching how trg_protect_booking_columns (Phase 1)
-- already treats it for the meetings table itself (rejects ANY update to an
-- already-cancelled row, no admin exception). Nothing carried that same
-- terminality down to the five child tables until now.
--
-- No admin exception here either, for the same reason 0009 had none: this
-- is "cancelled means dead," a business-logic invariant, not an
-- authorization boundary — matching the precedent already set by
-- trg_protect_booking_columns.
--
-- Deliberately scoped to CANCELLED only, not the UI's derived "COMPLETED"
-- status (a past-dated but never-cancelled meeting) — meetings.status only
-- ever stores CONFIRMED/CANCELLED in this schema; COMPLETED is computed
-- client-side from date/time and was never asked to be locked at the DB
-- level, unlike CANCELLED which the PRD explicitly calls out.
--
-- One shared trigger function covers agenda_items/meeting_participants/
-- action_items/minutes (all four have a meeting_id column directly); a
-- second small function handles minutes_items, which only has minutes_id
-- and needs one join to reach meeting_id. Both block INSERT, UPDATE, AND
-- DELETE — the same shared function that stops a new participant being
-- added on a cancelled meeting also stops an existing participant's own
-- RSVP self-update (0008) from going through, since both are UPDATE/INSERT
-- on the same table.

BEGIN;

CREATE OR REPLACE FUNCTION is_meeting_cancelled(p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $function$
  SELECT status = 'CANCELLED' FROM meetings WHERE id = p_meeting_id;
$function$;

CREATE OR REPLACE FUNCTION block_writes_on_cancelled_meeting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_meeting_id uuid;
begin
  v_meeting_id := COALESCE(NEW.meeting_id, OLD.meeting_id);
  if is_meeting_cancelled(v_meeting_id) then
    RAISE EXCEPTION 'This meeting is cancelled and can no longer be modified.';
  end if;
  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER block_writes_on_cancelled_meeting_agenda_items
  BEFORE INSERT OR UPDATE OR DELETE ON agenda_items
  FOR EACH ROW EXECUTE FUNCTION block_writes_on_cancelled_meeting();

CREATE TRIGGER block_writes_on_cancelled_meeting_participants
  BEFORE INSERT OR UPDATE OR DELETE ON meeting_participants
  FOR EACH ROW EXECUTE FUNCTION block_writes_on_cancelled_meeting();

CREATE TRIGGER block_writes_on_cancelled_meeting_action_items
  BEFORE INSERT OR UPDATE OR DELETE ON action_items
  FOR EACH ROW EXECUTE FUNCTION block_writes_on_cancelled_meeting();

CREATE TRIGGER block_writes_on_cancelled_meeting_minutes
  BEFORE INSERT OR UPDATE OR DELETE ON minutes
  FOR EACH ROW EXECUTE FUNCTION block_writes_on_cancelled_meeting();

CREATE OR REPLACE FUNCTION block_writes_on_cancelled_meeting_via_minutes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_minutes_id uuid;
  v_meeting_id uuid;
begin
  v_minutes_id := COALESCE(NEW.minutes_id, OLD.minutes_id);
  SELECT meeting_id INTO v_meeting_id FROM minutes WHERE id = v_minutes_id;
  if is_meeting_cancelled(v_meeting_id) then
    RAISE EXCEPTION 'This meeting is cancelled and can no longer be modified.';
  end if;
  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER block_writes_on_cancelled_meeting_minutes_items
  BEFORE INSERT OR UPDATE OR DELETE ON minutes_items
  FOR EACH ROW EXECUTE FUNCTION block_writes_on_cancelled_meeting_via_minutes();

COMMIT;
