-- Correction to 0033: auto-decline was keyed off the meeting's END time
-- (date + end_time), so an unapproved request would sit showing "Pending
-- Approval" through the meeting's entire scheduled duration before finally
-- resolving. Per explicit clarification, the intent is the meeting's START
-- time — if it isn't approved by the moment the meeting is supposed to
-- begin, decline it then, freeing the slot immediately rather than holding
-- it (uselessly, since it was never actually confirmed) for the rest of
-- the meeting's duration.
--
-- 0033 already ran against the live database, so this redefines the
-- function rather than editing that file in place.

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
