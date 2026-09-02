-- 0025_organizer_transfer_notification.sql
--
-- Two gaps found live after testing 0023 (organizer self-transfer): the new
-- organizer never got told, and there was nothing on the meeting itself
-- marking that a transfer had happened (unlike admin reassignment, which
-- already has its own reassigned_at/reassigned_by_name/reassignment_reason
-- trail and a "Reassigned by <admin>" banner).
--
-- organizer_transferred_at is the self-transfer's own timestamp, parallel
-- to reassigned_at (admin-only) and rescheduled_at (schedule changes) --
-- deliberately a separate column rather than reusing either of those, since
-- "who organizes this meeting changed, by the organizer themselves" is a
-- different fact from both. It's plain, un-protected, and not in
-- protect_booking_columns()'s blocked-column list, so no trigger change is
-- needed for a plain organizer to set it (same as rescheduled_at already
-- works).
--
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction as a
-- statement that references the new value, so this file is two separate
-- BEGIN/COMMIT blocks rather than one -- the enum addition must actually
-- commit before notify_meeting_status_change() can be recreated to use it.

BEGIN;
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MEETING_ORGANIZER_CHANGED';
COMMIT;

BEGIN;

ALTER TABLE meetings ADD COLUMN organizer_transferred_at timestamptz;

-- Extends 0019's version with one more branch. Deliberately an ELSIF after
-- the reassigned_at check, not a separate IF: admin reassignment changes
-- booked_by_id AND reassigned_at together, and that case already gets its
-- own notification pass above (0007/0019) -- this branch only fires when
-- booked_by_id changed WITHOUT reassigned_at also changing, which is
-- exactly a self-service transfer, not an admin one. No self-notify risk:
-- old.booked_by_id = auth.uid() is guaranteed by this table's RLS for any
-- non-admin caller who reaches this row at all, so a real change to
-- booked_by_id can never leave NEW.booked_by_id equal to auth.uid().
CREATE OR REPLACE FUNCTION notify_meeting_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
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
  end if;

  return NEW;
end;
$function$;

COMMIT;
