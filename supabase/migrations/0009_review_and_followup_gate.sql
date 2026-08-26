-- 0009_review_and_followup_gate.sql
--
-- Day 4 finding, proven live (not assumed): a direct REST PATCH to
-- /meetings?id=eq.<id> as the meeting's own organizer set review_date on a
-- meeting with zero open action items and got a 200. The "Save Review Date"
-- / "Schedule Follow-Up" gate (Day 3 spec) was only ever a UI check in
-- ReviewNextMeetingCard.tsx — nothing in the database enforced it, so any
-- direct API call, or a future UI bug, could silently bypass it. This closes
-- both halves: setting a meeting's own review_date, and creating a new
-- meeting as a follow-up (previous_meeting_id set) of one with nothing open.
--
-- No admin exception here, unlike protect_participant_columns (0008) — this
-- is a business-logic invariant ("a review date only makes sense when
-- something is still open"), not an ownership/authorization boundary, so it
-- holds for every role including admin, matching the plan's plain wording
-- ("genuinely cannot get a review date or a follow-up meeting").

BEGIN;

CREATE OR REPLACE FUNCTION enforce_review_date_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  if NEW.review_date IS NOT NULL AND NEW.review_date IS DISTINCT FROM OLD.review_date then
    if NOT EXISTS (
      SELECT 1 FROM action_items WHERE meeting_id = NEW.id AND status <> 'DONE'
    ) then
      RAISE EXCEPTION 'A review date can only be set while at least one action item is still open.';
    end if;
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER enforce_review_date_gate_before_update
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION enforce_review_date_gate();

CREATE OR REPLACE FUNCTION enforce_followup_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  if NEW.previous_meeting_id IS NOT NULL then
    if NOT EXISTS (
      SELECT 1 FROM action_items WHERE meeting_id = NEW.previous_meeting_id AND status <> 'DONE'
    ) then
      RAISE EXCEPTION 'A follow-up meeting can only be created while the previous meeting still has an open action item.';
    end if;
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER enforce_followup_gate_before_insert
  BEFORE INSERT ON meetings
  FOR EACH ROW EXECUTE FUNCTION enforce_followup_gate();

COMMIT;
