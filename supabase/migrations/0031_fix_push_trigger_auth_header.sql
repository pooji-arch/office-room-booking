-- Bug fix: every pg_net call to send-push was rejected with 401
-- UNAUTHORIZED_NO_AUTH_HEADER by Supabase's own Edge Function gateway,
-- before ever reaching the function's own code — the trigger sent a custom
-- x-internal-secret header but no Authorization header, which the gateway
-- requires on every invocation regardless of the function's own logic.
-- Fix: send the project's publishable (anon) key as both the Authorization
-- bearer token and the apikey header — the same thing supabase-js's own
-- functions.invoke() does under the hood. This key is already public
-- (shipped in the frontend bundle), so embedding it here isn't a new
-- exposure.

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
      'Authorization', 'Bearer sb_publishable_sysGwsshxs-V5lIaYIspxA_xoEA9Abl',
      'apikey', 'sb_publishable_sysGwsshxs-V5lIaYIspxA_xoEA9Abl',
      'x-internal-secret', 'bde99f9feba51985c7a1f8d045182fe2f03bc703ffffcec6'
    ),
    body := jsonb_build_object('notification_id', NEW.id)
  );
  return NEW;
end;
$function$;
