-- 0019_notify_all_admins_on_reassignment.sql
--
-- Reassignment notifications only ever reached the meeting's own organizer
-- and participants (via notify_meeting_audience, keyed to that one
-- meeting's own people) — an admin with no personal connection to the
-- meeting being reassigned never found out at all, even though reassigning
-- meetings is an admin-only action. Requested directly: with more than one
-- admin, every admin should know when any of them reassigns a meeting, not
-- just whoever happens to also be that meeting's organizer/participant.
--
-- Scoped to reassignment only (not cancellation, not the existing
-- organizer/participant notification) — that's the one case actually
-- asked for. Reuses the existing MEETING_RESCHEDULED type since the
-- frontend's icon/label mapping is keyed by type, not by title text; only
-- the title/message/link differ for this admin-facing copy.

BEGIN;

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

    -- Every admin, regardless of whether they organize/attend this
    -- meeting — excluding whoever just made the change (no need to notify
    -- yourself of your own action) and anyone already covered by the
    -- audience notification above (organizer/participant), so nobody gets
    -- two notifications for the same event.
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
  end if;

  return NEW;
end;
$function$;

COMMIT;
