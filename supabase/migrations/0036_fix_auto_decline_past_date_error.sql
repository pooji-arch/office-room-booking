-- Urgent fix: 0034/0035's auto_decline_expired_meeting_requests(), in its
-- RESCHEDULE branch, reverts date/start_time/end_time back to
-- pending_previous_* — which, since real time has moved on while the
-- request sat unapproved, is now itself in the past. That collides with
-- the pre-existing validate_booking_schedule_before_update trigger (Phase
-- 1, 0024), which rejects ANY write setting date/start_time into the past
-- with 'Cannot schedule a booking into a past date/time' (P0011) — it has
-- no way to know this specific write is a revert, not a new booking
-- attempt.
--
-- Confirmed live via cron.job_run_details: this has been failing on every
-- 15-minute run since the first stale reschedule request crossed its start
-- time, and because the error aborts the whole run_scheduled_reminders()
-- transaction, it has been silently blocking EVERY reminder type
-- (meeting/action-item reminders, overdue digest, MOM nudges), not just
-- this one meeting, until fixed.
--
-- Same fix, same justification as the other two triggers already disabled
-- here: this function IS the authoritative resolution for an expired
-- request, standing in for what an admin's own (trigger-bypassing) action
-- would do — disable validate_booking_schedule_before_update for the
-- duration of its writes too.

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
  ALTER TABLE meetings DISABLE TRIGGER validate_booking_schedule_before_update;

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
  ALTER TABLE meetings ENABLE TRIGGER validate_booking_schedule_before_update;
end;
$function$;
