-- Admin approval workflow: a non-admin's new booking, self-service
-- reschedule, or self-service cancellation no longer takes effect
-- immediately — it's staged as a pending request, and only an admin's
-- explicit approve/reject (via resolve_meeting_approval()) makes it real.
-- Anything an admin does directly (Book a Meeting, Edit & Reassign, admin
-- Cancel) is unaffected and stays immediate, since the admin IS the
-- approver.
--
-- Deliberately does NOT touch meetings.status, the no_overlapping_bookings
-- EXCLUDE constraint, or any RLS policy on meetings:
--   - The EXCLUDE constraint already excludes only status = 'CANCELLED'
--     rows. A pending booking/reschedule keeps status = 'CONFIRMED' the
--     whole time, so it already holds its room+time slot for free — no
--     constraint change needed to make a pending request block the slot.
--   - RLS already only gates row access (who may touch a meetings row at
--     all); exactly which columns that touch is allowed to change has
--     always been enforced by protect_booking_columns(), not RLS — this
--     migration extends that same pattern with a sibling trigger rather
--     than reopening any policy.

-- notification_type additions must land in their own transaction, committed
-- before anything in this migration references the new values (same
-- constraint hit in 0013 and 0025).
BEGIN;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MEETING_REQUEST_PENDING';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MEETING_REQUEST_APPROVED';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MEETING_REQUEST_REJECTED';

COMMIT;

BEGIN;

CREATE TYPE meeting_approval_status AS ENUM ('PENDING', 'APPROVED');
CREATE TYPE pending_meeting_action AS ENUM ('BOOKING', 'RESCHEDULE', 'CANCELLATION');

ALTER TABLE meetings
  ADD COLUMN approval_status meeting_approval_status NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN pending_action pending_meeting_action,
  -- Only ever set while pending_action = 'RESCHEDULE' — the room/date/time
  -- a rejected reschedule reverts back to. Room isn't included: a plain
  -- organizer can never change room_id at all (protect_booking_columns()
  -- blocks it outright), only admin's Edit & Reassign can, and that path
  -- is always auto-approved.
  ADD COLUMN pending_previous_date date,
  ADD COLUMN pending_previous_start_time time,
  ADD COLUMN pending_previous_end_time time,
  ADD COLUMN pending_requested_at timestamptz;

-- Shared "notify every admin" fan-out. The equivalent query has been
-- inlined ad hoc twice already (0019, 0025) — this is the third caller, so
-- it's worth a real helper now rather than a fourth copy-paste.
CREATE OR REPLACE FUNCTION notify_all_admins(
  p_meeting_id uuid, p_type notification_type, p_title text, p_message text, p_link text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  insert into notifications (recipient_id, type, title, message, link, meeting_id)
  select p.id, p_type, p_title, p_message, p_link, p_meeting_id
  from profiles p
  where p.role = 'ADMIN'
    and p.status = 'ACTIVE'
    and p.id is distinct from auth.uid();
end;
$function$;

-- Runs BEFORE INSERT and BEFORE UPDATE on meetings, before
-- trg_protect_booking_columns (alphabetically 'enforce' < 'trg') and before
-- set_booking_snapshots_trigger ('enforce' < 'set') — it only ever touches
-- approval/pending_* columns and, for a rejected-and-reverted reschedule,
-- date/start_time/end_time, none of which either of those triggers cares
-- about, so ordering relative to them doesn't matter in practice.
--
-- Admin actions always bypass this entirely (first check, unconditional
-- return) — Book a Meeting, Edit & Reassign, and admin Cancel stay
-- immediate exactly as before this migration.
CREATE OR REPLACE FUNCTION enforce_meeting_approval_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if public.is_admin() then
    -- An admin's own direct write always wins outright, whatever it is —
    -- but if the row had an unrelated pending request sitting on it (e.g.
    -- admin cancels a meeting that had a pending reschedule), clear that
    -- stale flag rather than leaving a resolved meeting stuck reading
    -- "awaiting approval".
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

  -- Self-cancel: protect_booking_columns() already lets a plain organizer
  -- flip status -> 'CANCELLED' on their own booking. Intercept that here —
  -- revert the live status/cancelled_at so the meeting stays exactly as
  -- confirmed as it was, keep whatever reason they gave in
  -- cancellation_reason as the staged request's reason, and mark it
  -- pending instead.
  if old.status <> 'CANCELLED' and new.status = 'CANCELLED' then
    new.status := old.status;
    new.cancelled_at := old.cancelled_at;
    new.approval_status := 'PENDING';
    new.pending_action := 'CANCELLATION';
    new.pending_requested_at := now();
    return new;
  end if;

  -- Self-reschedule: room_id changes are already blocked outright for a
  -- non-admin, so only date/start_time/end_time can move here. Let the new
  -- values take effect live — that's what holds the newly-requested slot
  -- via the EXCLUDE constraint — but snapshot the previous ones so a
  -- rejection can put it back, and mark the meeting pending until an admin
  -- signs off.
  if new.date is distinct from old.date
     or new.start_time is distinct from old.start_time
     or new.end_time is distinct from old.end_time
  then
    if old.approval_status = 'PENDING' and old.pending_action = 'RESCHEDULE' then
      -- Without this, a second reschedule attempt before the first is
      -- resolved would overwrite pending_previous_* with the first
      -- request's already-pending (not yet approved) values, so rejecting
      -- would revert to the wrong time.
      raise exception 'This meeting already has a reschedule request awaiting admin approval.';
    end if;
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

CREATE TRIGGER enforce_meeting_approval_gate_before_insert
  BEFORE INSERT ON meetings
  FOR EACH ROW EXECUTE FUNCTION enforce_meeting_approval_gate();

CREATE TRIGGER enforce_meeting_approval_gate_before_update
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION enforce_meeting_approval_gate();

-- New bookings need their own AFTER INSERT notify trigger — the existing
-- notify_meeting_status_change only ever ran AFTER UPDATE.
CREATE OR REPLACE FUNCTION notify_new_booking_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  if NEW.approval_status = 'PENDING' then
    perform notify_all_admins(
      NEW.id, 'MEETING_REQUEST_PENDING', 'New booking awaiting approval',
      '"' || COALESCE(NEW.title, NEW.purpose, 'A meeting') || '" is awaiting your approval.',
      '/admin/meetings/' || NEW.id
    );
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER notify_new_booking_pending_after_insert
  AFTER INSERT ON meetings
  FOR EACH ROW EXECUTE FUNCTION notify_new_booking_pending();

-- Full redefinition of the existing notify_meeting_status_change (adds one
-- elsif branch for a reschedule/cancellation request going pending; every
-- other branch is unchanged from 0025).
CREATE OR REPLACE FUNCTION notify_meeting_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_title text;
begin
  v_title := COALESCE(NEW.title, NEW.purpose, 'a meeting');

  if NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED' then
    PERFORM notify_meeting_audience(
      NEW.id, 'MEETING_CANCELLED', 'Meeting cancelled',
      '"' || v_title || '" was cancelled.', '/meetings/' || NEW.id
    );
  elsif NEW.reassigned_at IS DISTINCT FROM OLD.reassigned_at AND NEW.reassigned_at IS NOT NULL then
    PERFORM notify_meeting_audience(
      NEW.id, 'MEETING_RESCHEDULED', 'Meeting rescheduled',
      '"' || v_title || '" was rescheduled.', '/meetings/' || NEW.id
    );

    insert into notifications (recipient_id, type, title, message, link, meeting_id)
    select p.id, 'MEETING_RESCHEDULED', 'Meeting reassigned',
      'An admin reassigned "' || v_title || '".', '/admin/meetings/' || NEW.id, NEW.id
    from profiles p
    where p.role = 'ADMIN'
      and p.id is distinct from auth.uid()
      and p.id is distinct from NEW.booked_by_id
      and not exists (
        select 1 from meeting_participants mp
        where mp.meeting_id = NEW.id and mp.profile_id = p.id
      );
  elsif NEW.booked_by_id IS DISTINCT FROM OLD.booked_by_id then
    insert into notifications (recipient_id, type, title, message, link, meeting_id)
    values (
      NEW.booked_by_id, 'MEETING_ORGANIZER_CHANGED', 'You are now the organizer',
      'You are now the organizer of "' || v_title || '".', '/meetings/' || NEW.id, NEW.id
    );
  elsif NEW.approval_status = 'PENDING' AND OLD.approval_status IS DISTINCT FROM 'PENDING' then
    perform notify_all_admins(
      NEW.id, 'MEETING_REQUEST_PENDING',
      case NEW.pending_action
        when 'RESCHEDULE' then 'Reschedule awaiting approval'
        when 'CANCELLATION' then 'Cancellation awaiting approval'
        else 'Meeting awaiting approval'
      end,
      '"' || v_title || '" has a ' || lower(NEW.pending_action::text) || ' request awaiting your approval.',
      '/admin/meetings/' || NEW.id
    );
  end if;

  return NEW;
end;
$function$;

-- The one entry point for an admin's decision. Deliberately a single RPC
-- rather than a raw client-side UPDATE: what "approve"/"reject" actually
-- does differs by pending_action (approving a cancellation must apply it;
-- rejecting a reschedule must revert it; approving a booking/reschedule is
-- just clearing the pending flags since the live row already reflects the
-- requested state) — that branching belongs in one explicit function, not
-- guessed from a column diff in a trigger.
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
      -- BOOKING or RESCHEDULE: the live row already IS the requested state
      -- (that's how it held the slot) — approving just clears the flags.
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
      -- CANCELLATION rejected: nothing was ever applied, just clear the
      -- staged reason and the pending flags.
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

GRANT EXECUTE ON FUNCTION resolve_meeting_approval(uuid, boolean, text) TO authenticated;

COMMIT;
