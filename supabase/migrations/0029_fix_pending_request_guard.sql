-- Bug fix: 0028's guard against a corrupting second request only checked
-- "already has a pending RESCHEDULE" before allowing a new reschedule
-- through — it missed the case of a meeting whose original BOOKING is
-- still pending approval. A user could reschedule (or cancel) a
-- not-yet-approved booking, silently reclassifying it as a pending
-- RESCHEDULE/CANCELLATION and losing the fact the underlying booking was
-- never actually approved in the first place.
--
-- Fix: block ANY further self-service reschedule/cancel attempt whenever
-- the meeting already has ANY request awaiting approval, not just a
-- same-type one. Organizer transfer is untouched by this (it never
-- intersects date/start_time/end_time/status, so it was never affected).

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

  -- TG_OP = 'UPDATE', non-admin: a request is already awaiting approval on
  -- this meeting — block any further self-service reschedule/cancel until
  -- that one is resolved, whatever type it is.
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
  end if;

  return new;
end;
$function$;
