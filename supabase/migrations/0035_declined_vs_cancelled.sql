-- "Cancelled" and "Declined" are conceptually different: cancelled means a
-- meeting was genuinely confirmed and then called off; declined means a
-- booking request was never approved in the first place (rejected by an
-- admin, or auto-declined once its start time passed with no admin
-- action). Both currently land on status = 'CANCELLED' under the hood —
-- deliberately not changing that, since it's what already makes the
-- EXCLUDE double-booking constraint, room-availability queries, and the
-- "a cancelled meeting is fully locked" trigger (0012) all correctly treat
-- a declined booking as freeing its slot / becoming untouchable, with zero
-- changes needed to any of that. This only adds a display-layer flag on
-- top, same pattern as every other derived status in this app
-- (Completed/Rescheduled/Pending Approval are all computed, never stored
-- as their own status value either).
--
-- Scoped to BOOKING only: a rejected/auto-declined RESCHEDULE reverts to
-- its previous date/time and a rejected/auto-declined CANCELLATION just
-- un-stages the request — neither one ever sets status = 'CANCELLED', so
-- there's no "cancelled vs declined" ambiguity to resolve for those two.

ALTER TABLE meetings ADD COLUMN declined boolean NOT NULL DEFAULT false;

-- resolve_meeting_approval(): full redefinition (0028), only the reject/
-- BOOKING branch changes — adds declined = true.
CREATE OR REPLACE FUNCTION resolve_meeting_approval(
  p_meeting_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
) RETURNS meetings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  m meetings%rowtype;
begin
  if not is_admin() then
    raise exception 'Only an admin can approve or reject requests.';
  end if;

  select * into m from meetings where id = p_meeting_id for update;
  if not found then
    raise exception 'Meeting not found.';
  end if;
  if m.approval_status <> 'PENDING' then
    raise exception 'This meeting has no pending request.';
  end if;

  if p_approve then
    if m.pending_action = 'CANCELLATION' then
      update meetings set
        status = 'CANCELLED',
        cancelled_at = now(),
        approval_status = 'APPROVED',
        pending_action = null,
        pending_previous_date = null,
        pending_previous_start_time = null,
        pending_previous_end_time = null,
        pending_requested_at = null
      where id = p_meeting_id
      returning * into m;
    else
      update meetings set
        approval_status = 'APPROVED',
        pending_action = null,
        pending_previous_date = null,
        pending_previous_start_time = null,
        pending_previous_end_time = null,
        pending_requested_at = null
      where id = p_meeting_id
      returning * into m;
    end if;

    perform notify_meeting_audience(
      p_meeting_id, 'MEETING_REQUEST_APPROVED', 'Request approved',
      COALESCE(p_note, '"' || m.purpose || '" was approved.'),
      '/meetings/' || p_meeting_id
    );
  else
    if m.pending_action = 'BOOKING' then
      update meetings set
        status = 'CANCELLED',
        declined = true,
        cancelled_at = now(),
        cancellation_reason = COALESCE(p_note, 'Booking request rejected by admin.'),
        approval_status = 'APPROVED',
        pending_action = null,
        pending_requested_at = null
      where id = p_meeting_id
      returning * into m;
    elsif m.pending_action = 'RESCHEDULE' then
      update meetings set
        date = m.pending_previous_date,
        start_time = m.pending_previous_start_time,
        end_time = m.pending_previous_end_time,
        approval_status = 'APPROVED',
        pending_action = null,
        pending_previous_date = null,
        pending_previous_start_time = null,
        pending_previous_end_time = null,
        pending_requested_at = null
      where id = p_meeting_id
      returning * into m;
    else
      update meetings set
        cancellation_reason = null,
        approval_status = 'APPROVED',
        pending_action = null,
        pending_requested_at = null
      where id = p_meeting_id
      returning * into m;
    end if;

    perform notify_meeting_audience(
      p_meeting_id, 'MEETING_REQUEST_REJECTED', 'Request rejected',
      COALESCE(p_note, '"' || m.purpose || '" was rejected.'),
      '/meetings/' || p_meeting_id
    );
  end if;

  return m;
end;
$function$;

-- auto_decline_expired_meeting_requests(): same one-line addition to the
-- BOOKING branch (0034's version, keyed off start_time).
CREATE OR REPLACE FUNCTION auto_decline_expired_meeting_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  r record;
  v_now timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
  v_note text := 'Auto-declined — no admin action was taken before the meeting started.';
begin
  ALTER TABLE meetings DISABLE TRIGGER trg_protect_booking_columns;
  ALTER TABLE meetings DISABLE TRIGGER enforce_meeting_approval_gate_before_update;

  for r in
    SELECT id, title, purpose, pending_action, pending_previous_date,
           pending_previous_start_time, pending_previous_end_time
    FROM meetings
    WHERE approval_status = 'PENDING'
      AND (date + start_time) <= v_now
  loop
    if r.pending_action = 'BOOKING' then
      UPDATE meetings SET
        status = 'CANCELLED',
        declined = true,
        cancelled_at = now(),
        cancellation_reason = v_note,
        approval_status = 'APPROVED',
        pending_action = NULL,
        pending_requested_at = NULL
      WHERE id = r.id;
    elsif r.pending_action = 'RESCHEDULE' then
      UPDATE meetings SET
        date = r.pending_previous_date,
        start_time = r.pending_previous_start_time,
        end_time = r.pending_previous_end_time,
        approval_status = 'APPROVED',
        pending_action = NULL,
        pending_previous_date = NULL,
        pending_previous_start_time = NULL,
        pending_previous_end_time = NULL,
        pending_requested_at = NULL
      WHERE id = r.id;
    else
      UPDATE meetings SET
        cancellation_reason = NULL,
        approval_status = 'APPROVED',
        pending_action = NULL,
        pending_requested_at = NULL
      WHERE id = r.id;
    end if;

    PERFORM notify_meeting_audience(
      r.id, 'MEETING_REQUEST_REJECTED', 'Request auto-declined',
      '"' || COALESCE(r.title, r.purpose, 'A meeting') || '": ' || v_note,
      '/meetings/' || r.id
    );
  end loop;

  ALTER TABLE meetings ENABLE TRIGGER trg_protect_booking_columns;
  ALTER TABLE meetings ENABLE TRIGGER enforce_meeting_approval_gate_before_update;
end;
$function$;
