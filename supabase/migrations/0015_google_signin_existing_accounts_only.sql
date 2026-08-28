-- 0015_google_signin_existing_accounts_only.sql
--
-- Enables "Continue with Google" as an alternate sign-in method, restricted
-- to accounts an admin has already created — matching this whole app's
-- "admin provisions every account" model (see handle_new_user()'s existing
-- role-escalation guard from Phase 1). Without this, Supabase Auth would
-- happily create a brand-new profile for literally any Google account that
-- completes the OAuth flow.
--
-- How this actually works: when someone with an email that already has an
-- admin-created account (created via auth.admin.createUser(), password-
-- based) signs in with Google using the SAME email, Supabase Auth's default
-- behavior links the new Google identity to that SAME existing auth.users
-- row — no new row is inserted, so this trigger never even fires for that
-- case, and login just works. This trigger only ever fires when Supabase is
-- about to create a genuinely NEW auth.users row for a NON-email provider —
-- which only happens when there was nothing existing to link to. That's
-- exactly the "no matching account" case we want to reject, so checking
-- provider != 'email' is sufficient; the profiles-by-email check is a second,
-- explicit line of defense in case auto-linking is ever disabled.
--
-- BEFORE INSERT + RAISE EXCEPTION rolls back the whole row (Postgres
-- transactions are atomic), so no orphaned auth.users row is left behind —
-- Supabase Auth surfaces the exception message back to the client as an
-- error on the OAuth redirect, which the login page reads and displays.
--
-- Deliberately does NOT touch handle_new_user() at all — this is a separate
-- BEFORE INSERT trigger, so the existing Phase 1 function (with its own
-- already-audited role-escalation fix) is left completely alone.

BEGIN;

CREATE OR REPLACE FUNCTION reject_unrecognized_oauth_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  if NEW.raw_app_meta_data->>'provider' IS DISTINCT FROM 'email' then
    if NOT EXISTS (SELECT 1 FROM profiles WHERE lower(email) = lower(NEW.email)) then
      RAISE EXCEPTION 'No account found for this email. Contact your administrator.';
    end if;
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER reject_unrecognized_oauth_signup_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION reject_unrecognized_oauth_signup();

COMMIT;
