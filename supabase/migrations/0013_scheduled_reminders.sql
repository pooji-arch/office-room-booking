-- 0013_scheduled_reminders.sql
--
-- Day 5's remaining gap: scheduled (time-based) reminders, scoped to
-- in-app only per the user's decision — no email vendor/domain exists yet,
-- so every reminder here lands in the same notifications inbox (0007)
-- rather than an inbox somewhere else. Adding real email later is a matter
-- of extending run_scheduled_reminders() to also call an Edge Function that
-- sends mail for each row it inserts — nothing here needs to change to
-- support that later.
--
-- Four reminder types, matching the original PRD wording exactly:
--   1. Pre-meeting reminders — 24hr and 1hr before start, to every
--      participant + the organizer (reuses notify_meeting_audience() from
--      0007 — with no auth.uid() in a cron context, its exclusion clause
--      naturally excludes nobody, which is correct: there's no "acting
--      user" to leave out of a reminder nobody triggered).
--   2. Action-item due reminders — the day before due_date, to the owner.
--   3. Overdue digest — once per owner per day, a single rolled-up count,
--      not one notification per overdue item.
--   4. MOM-pending nudge — if minutes are still DRAFT (or don't exist at
--      all) 24h after the meeting ended.
--
-- Each reminder type tracks its own "already sent" state directly on the
-- row it's about (reminder_24h_sent_at, due_reminder_sent_at, etc.) rather
-- than querying notification history — simpler, and immune to the digest
-- ever double-counting if the cron run overlaps itself.
--
-- Split into two transactions on purpose: ALTER TYPE ADD VALUE cannot be
-- relied upon in the same transaction as code that uses the new enum
-- values (a well-known Postgres restriction), so the enum additions commit
-- fully before anything references them.

BEGIN;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MEETING_REMINDER_24H';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MEETING_REMINDER_1H';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ACTION_ITEM_DUE_SOON';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'ACTION_ITEM_OVERDUE_DIGEST';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'MOM_PENDING_NUDGE';

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS mom_nudge_sent_at timestamptz;

ALTER TABLE action_items
  ADD COLUMN IF NOT EXISTS due_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_overdue_digest_sent_at date;

COMMIT;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION send_meeting_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  r record;
begin
  for r in
    SELECT id, title, purpose
    FROM meetings
    WHERE status = 'CONFIRMED'
      AND reminder_24h_sent_at IS NULL
      AND (date + start_time) > now()
      AND (date + start_time) <= now() + interval '24 hours'
  loop
    PERFORM notify_meeting_audience(r.id, 'MEETING_REMINDER_24H', 'Meeting tomorrow',
      '"' || COALESCE(r.title, r.purpose, 'a meeting') || '" starts in about 24 hours.',
      '/meetings/' || r.id);
    UPDATE meetings SET reminder_24h_sent_at = now() WHERE id = r.id;
  end loop;

  for r in
    SELECT id, title, purpose
    FROM meetings
    WHERE status = 'CONFIRMED'
      AND reminder_1h_sent_at IS NULL
      AND (date + start_time) > now()
      AND (date + start_time) <= now() + interval '1 hour'
  loop
    PERFORM notify_meeting_audience(r.id, 'MEETING_REMINDER_1H', 'Meeting starting soon',
      '"' || COALESCE(r.title, r.purpose, 'a meeting') || '" starts in about 1 hour.',
      '/meetings/' || r.id);
    UPDATE meetings SET reminder_1h_sent_at = now() WHERE id = r.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION send_action_item_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  r record;
begin
  for r in
    SELECT id, title, owner_id, due_date, meeting_id
    FROM action_items
    WHERE owner_id IS NOT NULL
      AND status <> 'DONE'
      AND due_reminder_sent_at IS NULL
      AND due_date BETWEEN current_date AND current_date + 1
  loop
    INSERT INTO notifications (recipient_id, type, title, message, link, meeting_id)
    VALUES (r.owner_id, 'ACTION_ITEM_DUE_SOON', 'Action item due soon',
      '"' || r.title || '" is due ' || to_char(r.due_date, 'Mon DD') || '.',
      '/meetings/' || r.meeting_id, r.meeting_id);
    UPDATE action_items SET due_reminder_sent_at = now() WHERE id = r.id;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION send_overdue_digest()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  r record;
begin
  for r in
    SELECT owner_id, count(*) AS overdue_count
    FROM action_items
    WHERE owner_id IS NOT NULL
      AND status <> 'DONE'
      AND due_date < current_date
      AND (last_overdue_digest_sent_at IS NULL OR last_overdue_digest_sent_at < current_date)
    GROUP BY owner_id
  loop
    INSERT INTO notifications (recipient_id, type, title, message, link)
    VALUES (r.owner_id, 'ACTION_ITEM_OVERDUE_DIGEST', 'Overdue action items',
      'You have ' || r.overdue_count || ' overdue action item' || CASE WHEN r.overdue_count = 1 THEN '' ELSE 's' END || '.',
      NULL);
    UPDATE action_items
    SET last_overdue_digest_sent_at = current_date
    WHERE owner_id = r.owner_id AND status <> 'DONE' AND due_date < current_date;
  end loop;
end;
$function$;

CREATE OR REPLACE FUNCTION send_mom_pending_nudges()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  r record;
begin
  for r in
    SELECT m.id, m.title, m.purpose, m.booked_by_id
    FROM meetings m
    LEFT JOIN minutes mn ON mn.meeting_id = m.id
    WHERE m.status = 'CONFIRMED'
      AND m.mom_nudge_sent_at IS NULL
      AND (m.date + m.end_time) <= now() - interval '24 hours'
      AND (mn.id IS NULL OR mn.status = 'DRAFT')
  loop
    INSERT INTO notifications (recipient_id, type, title, message, link, meeting_id)
    VALUES (r.booked_by_id, 'MOM_PENDING_NUDGE', 'Minutes still pending',
      'Minutes for "' || COALESCE(r.title, r.purpose, 'a meeting') || '" haven''t been finalized yet.',
      '/meetings/' || r.id, r.id);
    UPDATE meetings SET mom_nudge_sent_at = now() WHERE id = r.id;
  end loop;
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
end;
$function$;

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-reminders') THEN
    PERFORM cron.unschedule('run-scheduled-reminders');
  END IF;
END
$do$;

SELECT cron.schedule('run-scheduled-reminders', '*/15 * * * *', $$SELECT run_scheduled_reminders();$$);

COMMIT;
