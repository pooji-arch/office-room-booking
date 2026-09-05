-- Real gap found via live use: a pending booking/reschedule/cancellation
-- request with no admin decision just sat showing "Pending Approval"
-- forever, even long after the meeting's own scheduled time had passed —
-- meetingDisplayStatus() checks approvalStatus === 'PENDING' before it ever
-- checks whether the meeting is over, so a stale request could never
-- resolve itself on its own. Explicit decision from the user: once a
-- meeting's time has passed with no admin action, treat it the same as an
-- admin rejecting it — "if they haven't approved then it has to be like
-- declined way, no other can be done without the approval."
--
-- This runs as a real, periodic backend job (reusing the existing
-- run_scheduled_reminders() pg_cron job from 0013/0014, every 15 minutes)
-- rather than a client-side display trick, because "declined" has to be a
-- real state change: a pending BOOKING must actually become CANCELLED, a
-- pending RESCHEDULE must actually revert to its previous date/time — a
-- rejected request is data, not just a label. The same
-- (now() AT TIME ZONE 'Asia/Kolkata') pattern from 0014 is reused here, for
-- the same reason: meetings.date/start_time/end_time have only ever meant
-- India wall-clock, never UTC.
--
-- Mirrors resolve_meeting_approval()'s own reject branch exactly (0028) —
-- this is the same three-way split (BOOKING/RESCHEDULE/CANCELLATION), just
-- triggered by an expired deadline instead of an admin click, so it can't
-- call is_admin() (there's no acting admin in a cron context) and instead
-- runs as its own SECURITY DEFINER function.
--
-- Because there's no real admin session behind this write, is_admin()
-- resolves false here — which would make enforce_meeting_approval_gate()
-- (0028) and the pre-existing trg_protect_booking_columns both treat these
-- UPDATEs as an illegitimate self-service change and corrupt them (e.g.
-- redirect the reschedule-revert into yet another pending request). Same
-- problem, same fix as the two prior migration-time bulk updates that hit
-- this (0001, 0022): disable the two actor-gated triggers for the duration
-- of the writes, then re-enable them. Safe even if this function errors
-- mid-loop — DISABLE/ENABLE TRIGGER is ordinary transactional DDL, so an
-- uncaught exception rolls the whole cron-triggered transaction (including
-- the disable) back, restoring both triggers automatically.

CREATE OR REPLACE FUNCTION auto_decline_expired_meeting_requests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  r record;
  v_now timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
  v_note text := 'Auto-declined — no admin action was taken before the meeting''s scheduled time passed.';
begin
  ALTER TABLE meetings DISABLE TRIGGER trg_protect_booking_columns;
  ALTER TABLE meetings DISABLE TRIGGER enforce_meeting_approval_gate_before_update;

  for r in
    SELECT id, title, purpose, pending_action, pending_previous_date,
           pending_previous_start_time, pending_previous_end_time
    FROM meetings
    WHERE approval_status = 'PENDING'
      AND (date + end_time) <= v_now
  loop
    if r.pending_action = 'BOOKING' then
      UPDATE meetings SET
        status = 'CANCELLED',
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
      -- CANCELLATION: the live row was never actually cancelled (the
      -- approval-gate trigger reverts that write immediately, in 0028) —
      -- declining just un-stages the request, nothing else changes.
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

CREATE OR REPLACE FUNCTION run_scheduled_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  PERFORM send_meeting_reminders();
  PERFORM send_action_item_reminders();
  PERFORM send_overdue_digest();
  PERFORM send_mom_pending_nudges();
  PERFORM auto_decline_expired_meeting_requests();
end;
$function$;
