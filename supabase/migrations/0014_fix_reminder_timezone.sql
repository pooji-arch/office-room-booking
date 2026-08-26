-- 0014_fix_reminder_timezone.sql
--
-- Real bug found live, immediately after 0013 shipped: booked a meeting for
-- "50 minutes from now" (in India wall-clock — confirmed via the browser's
-- own local time, which is IST) and only the 24-hour reminder fired; the
-- 1-hour reminder never did. A meeting 50 minutes out unambiguously belongs
-- in the 1-hour window, so the comparison itself was wrong, not the data.
--
-- Root cause: 0013's functions compared meetings.date + meetings.start_time
-- (naive, no time zone — and never has been anywhere in this app) directly
-- against now() (an absolute instant). Postgres resolves that comparison by
-- casting the naive side using the connection's session TimeZone setting,
-- which for a PostgREST/RPC call defaults to UTC — but every date/start_time
-- value in this whole app has only ever meant India wall-clock (confirmed
-- separately: booking the same meeting was accepted as "not in the past" by
-- the pre-existing Phase 1 validate_booking_schedule() trigger, which
-- clearly reasons in IST, not UTC). 0013's bare now() silently assumed UTC
-- and was therefore measuring the wrong distance to every meeting.
--
-- Fix: replace now() with (now() AT TIME ZONE 'Asia/Kolkata') everywhere a
-- naive date/time column is compared against "the current moment" — this
-- produces a naive timestamp in India wall-clock, matching the only
-- convention meetings.date/start_time/end_time have ever used. Same fix
-- applied to current_date in the two functions that used it, for the same
-- reason (a naive date compared against the wrong day near midnight would
-- have the same class of bug, just rarer in practice).

BEGIN;

CREATE OR REPLACE FUNCTION send_meeting_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  r record;
  v_now timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
begin
  for r in
    SELECT id, title, purpose
    FROM meetings
    WHERE status = 'CONFIRMED'
      AND reminder_24h_sent_at IS NULL
      AND (date + start_time) > v_now
      AND (date + start_time) <= v_now + interval '24 hours'
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
      AND (date + start_time) > v_now
      AND (date + start_time) <= v_now + interval '1 hour'
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
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
begin
  for r in
    SELECT id, title, owner_id, due_date, meeting_id
    FROM action_items
    WHERE owner_id IS NOT NULL
      AND status <> 'DONE'
      AND due_reminder_sent_at IS NULL
      AND due_date BETWEEN v_today AND v_today + 1
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
  v_today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
begin
  for r in
    SELECT owner_id, count(*) AS overdue_count
    FROM action_items
    WHERE owner_id IS NOT NULL
      AND status <> 'DONE'
      AND due_date < v_today
      AND (last_overdue_digest_sent_at IS NULL OR last_overdue_digest_sent_at < v_today)
    GROUP BY owner_id
  loop
    INSERT INTO notifications (recipient_id, type, title, message, link)
    VALUES (r.owner_id, 'ACTION_ITEM_OVERDUE_DIGEST', 'Overdue action items',
      'You have ' || r.overdue_count || ' overdue action item' || CASE WHEN r.overdue_count = 1 THEN '' ELSE 's' END || '.',
      NULL);
    UPDATE action_items
    SET last_overdue_digest_sent_at = v_today
    WHERE owner_id = r.owner_id AND status <> 'DONE' AND due_date < v_today;
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
  v_now timestamp := (now() AT TIME ZONE 'Asia/Kolkata');
begin
  for r in
    SELECT m.id, m.title, m.purpose, m.booked_by_id
    FROM meetings m
    LEFT JOIN minutes mn ON mn.meeting_id = m.id
    WHERE m.status = 'CONFIRMED'
      AND m.mom_nudge_sent_at IS NULL
      AND (m.date + m.end_time) <= v_now - interval '24 hours'
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

COMMIT;
