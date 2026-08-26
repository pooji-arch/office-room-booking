-- 0007_notifications.sql
--
-- Day 4 of the Meeting Management System Phase 2 build: in-app Reminders &
-- Notifications (PRD Phase D, RN scope). Email/WhatsApp/SMS are explicitly
-- out of scope this round (no vendor account configured) — this migration
-- only covers event-triggered in-app notifications: a participant is added,
-- an action item is assigned to you, a meeting is cancelled or rescheduled,
-- or minutes are finalized. Time-based reminders (24hr/1hr before a
-- meeting, overdue digests) need a scheduler (pg_cron) and are deferred.
--
-- Notifications are trigger-generated only — there is deliberately no
-- INSERT policy on this table for `authenticated`, the same pattern this
-- project already uses for `profiles` (a client can never create one
-- directly; only a trigger running as SECURITY DEFINER can). All four
-- trigger functions below are SECURITY DEFINER for exactly that reason,
-- matching is_admin()'s existing pattern.

BEGIN;

CREATE TYPE notification_type AS ENUM (
  'PARTICIPANT_ADDED', 'ACTION_ITEM_ASSIGNED', 'MEETING_CANCELLED',
  'MEETING_RESCHEDULED', 'MINUTES_FINALIZED'
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  meeting_id uuid REFERENCES meetings(id) ON DELETE CASCADE,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_recipient_created_idx ON notifications(recipient_id, created_at DESC);
CREATE INDEX notifications_recipient_unread_idx ON notifications(recipient_id) WHERE NOT read;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_select_own_or_admin
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid() OR is_admin());

CREATE POLICY notifications_update_own
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- No INSERT policy at all — see header comment.

-- Shared fan-out: notify every participant + the organizer of a meeting,
-- excluding whoever performed the triggering action, so nobody gets
-- notified of their own change.
CREATE OR REPLACE FUNCTION notify_meeting_audience(
  p_meeting_id uuid, p_type notification_type, p_title text, p_message text, p_link text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  INSERT INTO notifications (recipient_id, type, title, message, link, meeting_id)
  SELECT DISTINCT r.profile_id, p_type, p_title, p_message, p_link, p_meeting_id
  FROM (
    SELECT booked_by_id AS profile_id FROM meetings WHERE id = p_meeting_id
    UNION
    SELECT profile_id FROM meeting_participants WHERE meeting_id = p_meeting_id AND profile_id IS NOT NULL
  ) r
  WHERE r.profile_id IS DISTINCT FROM auth.uid();
end;
$function$;

CREATE OR REPLACE FUNCTION notify_participant_added() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_title text;
begin
  IF NEW.profile_id IS NOT NULL AND NEW.profile_id IS DISTINCT FROM auth.uid() THEN
    SELECT COALESCE(title, purpose, 'a meeting') INTO v_title FROM meetings WHERE id = NEW.meeting_id;
    INSERT INTO notifications (recipient_id, type, title, message, link, meeting_id)
    VALUES (
      NEW.profile_id, 'PARTICIPANT_ADDED', 'Added to a meeting',
      'You were added to "' || v_title || '".',
      '/meetings/' || NEW.meeting_id, NEW.meeting_id
    );
  END IF;
  RETURN NEW;
end;
$function$;

CREATE TRIGGER notify_participant_added_after_insert
  AFTER INSERT ON meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_participant_added();

CREATE OR REPLACE FUNCTION notify_action_item_assigned() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  IF NEW.owner_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR NEW.owner_id IS DISTINCT FROM OLD.owner_id)
     AND NEW.owner_id IS DISTINCT FROM auth.uid()
  THEN
    INSERT INTO notifications (recipient_id, type, title, message, link, meeting_id)
    VALUES (
      NEW.owner_id, 'ACTION_ITEM_ASSIGNED', 'Action item assigned to you',
      NEW.title, '/meetings/' || NEW.meeting_id, NEW.meeting_id
    );
  END IF;
  RETURN NEW;
end;
$function$;

CREATE TRIGGER notify_action_item_assigned_after_change
  AFTER INSERT OR UPDATE ON action_items
  FOR EACH ROW
  EXECUTE FUNCTION notify_action_item_assigned();

CREATE OR REPLACE FUNCTION notify_meeting_status_change() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_title text;
begin
  v_title := COALESCE(NEW.title, NEW.purpose, 'a meeting');

  IF NEW.status = 'CANCELLED' AND OLD.status IS DISTINCT FROM 'CANCELLED' THEN
    PERFORM notify_meeting_audience(
      NEW.id, 'MEETING_CANCELLED', 'Meeting cancelled',
      '"' || v_title || '" was cancelled.', '/meetings/' || NEW.id
    );
  ELSIF NEW.reassigned_at IS DISTINCT FROM OLD.reassigned_at AND NEW.reassigned_at IS NOT NULL THEN
    PERFORM notify_meeting_audience(
      NEW.id, 'MEETING_RESCHEDULED', 'Meeting rescheduled',
      '"' || v_title || '" was rescheduled.', '/meetings/' || NEW.id
    );
  END IF;

  RETURN NEW;
end;
$function$;

CREATE TRIGGER notify_meeting_status_change_after_update
  AFTER UPDATE ON meetings
  FOR EACH ROW
  EXECUTE FUNCTION notify_meeting_status_change();

CREATE OR REPLACE FUNCTION notify_minutes_finalized() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_title text;
begin
  IF NEW.status = 'FINAL' AND OLD.status IS DISTINCT FROM 'FINAL' THEN
    SELECT COALESCE(title, purpose, 'a meeting') INTO v_title FROM meetings WHERE id = NEW.meeting_id;
    PERFORM notify_meeting_audience(
      NEW.meeting_id, 'MINUTES_FINALIZED', 'Minutes finalized',
      'Minutes for "' || v_title || '" were finalized.', '/meetings/' || NEW.meeting_id
    );
  END IF;
  RETURN NEW;
end;
$function$;

CREATE TRIGGER notify_minutes_finalized_after_update
  AFTER UPDATE ON minutes
  FOR EACH ROW
  EXECUTE FUNCTION notify_minutes_finalized();

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

COMMIT;
