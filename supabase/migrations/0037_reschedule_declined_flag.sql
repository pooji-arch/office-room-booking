-- A declined RESCHEDULE reverts the meeting silently to its prior confirmed
-- state — correct for the main status badge (the meeting itself is real and
-- happened/will happen, so it should read Completed/Confirmed, not
-- Declined), but that leaves no visible trace that a reschedule attempt was
-- ever declined at all. Per explicit request: show a small secondary
-- indicator alongside the main status badge, the same way a "Follow-up" or
-- "Transferred" pill already does for other meeting facts — not replacing
-- the main badge, just adding to it.

ALTER TABLE meetings ADD COLUMN reschedule_declined boolean NOT NULL DEFAULT false;

-- enforce_meeting_approval_gate(): full redefinition (0029's version), only
-- the self-reschedule branch changes — clears any stale flag from a
-- previously-declined attempt the moment a fresh reschedule request starts,
-- so an in-flight "Pending Approval" is never shown alongside a leftover
-- "Declined" pill from an earlier, already-resolved attempt.
CREATE OR REPLACE FUNCTION enforce_meeting_approval_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if public.is_admin() then
    if TG_OP = 'UPDATE' and old.approval_status = 'PENDING' then
      new.approval_status := 'APPROVED';
      new.pending_action := null;
      new.pending_previous_date := null;
      new.pending_previous_start_time := null;
      new.pending_previous_end_time := null;
      new.pending_requested_at := null;
    end if;
    return new;
  end if;

  if TG_OP = 'INSERT' then
    new.approval_status := 'PENDING';
    new.pending_action := 'BOOKING';
    new.pending_requested_at := now();
    return new;
  end if;

  if old.approval_status = 'PENDING'
     and (
       (old.status <> 'CANCELLED' and new.status = 'CANCELLED')
       or new.date is distinct from old.date
       or new.start_time is distinct from old.start_time
       or new.end_time is distinct from old.end_time
     )
  then
    raise exception 'This meeting already has a % request awaiting admin approval.',
      lower(old.pending_action::text);
  end if;

  if old.status <> 'CANCELLED' and new.status = 'CANCELLED' then
    new.status := old.status;
    new.cancelled_at := old.cancelled_at;
    new.approval_status := 'PENDING';
    new.pending_action := 'CANCELLATION';
    new.pending_requested_at := now();
    return new;
  end if;

  if new.date is distinct from old.date
     or new.start_time is distinct from old.start_time
     or new.end_time is distinct from old.end_time
  then
    new.pending_previous_date := old.date;
    new.pending_previous_start_time := old.start_time;
    new.pending_previous_end_time := old.end_time;
    new.approval_status := 'PENDING';
    new.pending_action := 'RESCHEDULE';
    new.pending_requested_at := now();
    new.reschedule_declined := false;
  end if;

  return new;
end;
$function$;

-- resolve_meeting_approval(): full redefinition (0035's version), only the
-- reject/RESCHEDULE branch changes — adds reschedule_declined = true.
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
        reschedule_declined = true,
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
-- RESCHEDULE branch (0036's version, with all three trigger disables kept).
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
        reschedule_declined = true,
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
