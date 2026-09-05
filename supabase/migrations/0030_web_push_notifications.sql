-- Browser/OS-level push notifications, layered on top of the existing
-- in-app `notifications` table rather than replacing it. Every notification
-- still gets its normal in-app row; this migration additionally fires an
-- async HTTP call (via pg_net) to a Supabase Edge Function ("send-push")
-- that looks up the recipient's push subscriptions and sends a real Web
-- Push to each one. The Edge Function itself is deployed separately
-- (supabase/functions/send-push) — this migration only wires the trigger
-- that calls it.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- One row per browser/device a user has granted notification permission on
-- (the standard Web Push subscription shape: an endpoint URL plus two
-- encryption keys). RLS-owned by the subscribing user, same pattern as
-- every other user-owned table in this schema; the Edge Function reads this
-- with its own service-role key, bypassing RLS, same as every other
-- server-side job here.
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_subscriptions_profile_idx ON push_subscriptions(profile_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_select_own ON push_subscriptions
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own ON push_subscriptions
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own ON push_subscriptions
  FOR DELETE USING (profile_id = auth.uid());

-- The shared secret here (also set as the send-push function's
-- INTERNAL_PUSH_SECRET) just stops a stray outsider from replaying an
-- existing notification id to force a re-push — it isn't protecting
-- anything sensitive (the function only ever re-sends a notification that
-- already exists, to its own already-registered recipient), so a plain
-- literal here (rather than Vault) is proportionate.
CREATE OR REPLACE FUNCTION notify_push_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  PERFORM net.http_post(
    url := 'https://zgnrnbvpnlnrheagixoc.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', 'bde99f9feba51985c7a1f8d045182fe2f03bc703ffffcec6'
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
end;
$function$;

CREATE TRIGGER notify_push_after_insert_trigger
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_push_after_insert();
