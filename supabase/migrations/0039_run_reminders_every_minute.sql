-- User wants auto-decline (and the other scheduled reminders it now shares
-- a job with) to feel near-instant, not wait up to 15 minutes. pg_cron has
-- a hard floor of 1-minute granularity — it cannot fire more often than
-- that — so "every minute" is the closest this mechanism can get to
-- instant. Worst case is now ~59 seconds after a meeting's start time
-- instead of up to 15 minutes.
--
-- Same re-schedule pattern already used when this job was first created
-- (0013): unschedule by name if it exists, then schedule fresh.

DO $do$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'run-scheduled-reminders') THEN
    PERFORM cron.unschedule('run-scheduled-reminders');
  END IF;
END
$do$;

SELECT cron.schedule('run-scheduled-reminders', '* * * * *', $$SELECT run_scheduled_reminders();$$);
