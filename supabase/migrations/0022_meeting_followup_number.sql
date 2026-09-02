-- 0022_meeting_followup_number.sql
--
-- Requested directly: the "Follow-up" badge on the meetings list should show
-- how many meetings deep a follow-up chain is (e.g. "Follow-up x2", "x3"),
-- not just a flat yes/no. That needs the chain POSITION stored on each
-- meeting, not computed ad hoc in the frontend -- the same "which meeting
-- comes before this one" question this app already answers per-meeting via
-- previous_meeting_id, just carried one step further into a running count.
--
-- follow_up_number = 1 for a meeting with no previous meeting (the root of
-- its own chain), or (previous meeting's follow_up_number + 1) for a
-- follow-up. Set once at creation time by a BEFORE INSERT trigger -- nothing
-- in this app ever changes previous_meeting_id after creation (confirmed:
-- it's written in exactly one place, createMeeting's insert, and never
-- appears in any UPDATE payload), so there is no corresponding UPDATE case
-- to handle.
--
-- SECURITY DEFINER: matches every comparable helper/trigger in this project
-- that reads a meetings row on behalf of the caller (record_meeting_history,
-- enforce_followup_gate, is_meeting_cancelled, is_meeting_chair, etc.) --
-- is_meeting_chair's own comment explains why this convention is kept even
-- when not strictly required today: meetings' SELECT RLS happens to be open
-- to any authenticated user right now, but if that policy is ever
-- tightened, a plain SECURITY INVOKER read here would silently return no
-- row instead of erroring, producing a silently wrong follow_up_number
-- instead of a loud failure.
--
-- Backfill hazard, same one 0001 already documented and worked around for
-- its own title backfill: trg_protect_booking_columns (BEFORE UPDATE,
-- unconditional) rejects ANY update to an already-CANCELLED meeting,
-- regardless of which column changes. The backfill below updates
-- follow_up_number on every existing row (including cancelled ones, whose
-- chain position is just as real), so the same trigger is disabled for the
-- duration of that one statement and re-enabled immediately after, exactly
-- as 0001 did.
--
-- Post-backfill safety check: the backfill's UPDATE ... FROM behaves as an
-- inner join against the recursive "chain" CTE, so any row that never gets
-- pulled into that CTE would silently stay at the column's default of 1
-- with no error. This can't actually happen today -- previous_meeting_id is
-- an immediate FK (the referenced row must already exist at INSERT time)
-- and is only ever set at INSERT, so a reference cycle is structurally
-- impossible via this app -- but rather than relying implicitly on that
-- argument, this migration verifies it explicitly and raises loudly if a
-- follow-up meeting was ever left unresolved.

BEGIN;

ALTER TABLE meetings ADD COLUMN follow_up_number integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION set_meeting_follow_up_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_previous_number integer;
begin
  if NEW.previous_meeting_id is not null then
    select follow_up_number into v_previous_number
    from meetings
    where id = NEW.previous_meeting_id;

    NEW.follow_up_number := coalesce(v_previous_number, 0) + 1;
  else
    NEW.follow_up_number := 1;
  end if;

  return NEW;
end;
$function$;

CREATE TRIGGER set_meeting_follow_up_number_before_insert
  BEFORE INSERT ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION set_meeting_follow_up_number();

-- Backfill every existing row's real chain position. ALTER TABLE ... DEFAULT
-- 1 above left every pre-existing row at 1 regardless of whether it's
-- actually a follow-up -- this recursive walk computes the true depth for
-- the entire existing dataset in one pass, starting from every root meeting
-- (previous_meeting_id IS NULL) and following previous_meeting_id forward
-- to each descendant.
ALTER TABLE meetings DISABLE TRIGGER trg_protect_booking_columns;

WITH RECURSIVE chain AS (
  SELECT id, 1 AS depth
  FROM meetings
  WHERE previous_meeting_id IS NULL

  UNION ALL

  SELECT m.id, chain.depth + 1
  FROM meetings m
  JOIN chain ON m.previous_meeting_id = chain.id
)
UPDATE meetings
SET follow_up_number = chain.depth
FROM chain
WHERE meetings.id = chain.id
  AND meetings.follow_up_number IS DISTINCT FROM chain.depth;

ALTER TABLE meetings ENABLE TRIGGER trg_protect_booking_columns;

DO $$
declare
  v_unresolved integer;
begin
  select count(*) into v_unresolved
  from meetings
  where previous_meeting_id is not null
    and follow_up_number = 1;

  if v_unresolved > 0 then
    raise exception
      'follow_up_number backfill left % follow-up meeting(s) unresolved at the default of 1 -- check for a previous_meeting_id reference the recursive backfill could not reach.',
      v_unresolved;
  end if;
end;
$$;

COMMIT;
