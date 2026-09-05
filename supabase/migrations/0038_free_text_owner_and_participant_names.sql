-- Explicit product decision: Add Participant, Agenda item owner, and Action
-- item owner all become free-text name entry instead of picking a real
-- registered account. Acknowledged tradeoff (told to the user before this
-- was built): a free-text-only person has no real auth.uid() to link to, so
-- RSVP accept/decline, "assigned to you" notifications, the HIGH-priority
-- self-close sign-off gate, and a Chair's elevated permissions never apply
-- to them — there's no account to grant any of that to. This migration
-- doesn't touch profile_id/owner_id or any of that logic at all; it only
-- adds a free-text fallback identity alongside them, so a real-account
-- assignment (if one is ever made some other way) keeps working exactly as
-- it always has.

-- meeting_participants already had this exact concept from Day 1
-- (external_name/external_email/external_organization columns), but the
-- CHECK constraint required an email too. Loosen it to accept a bare name —
-- the new Add Participant form only asks for Name + Role, no email.
ALTER TABLE meeting_participants DROP CONSTRAINT meeting_participants_identity_check;
ALTER TABLE meeting_participants ADD CONSTRAINT meeting_participants_identity_check
  CHECK (profile_id IS NOT NULL OR external_name IS NOT NULL OR external_email IS NOT NULL);

-- agenda_items / action_items never had a free-text fallback at all —
-- owner_id was the only identity column, and the frontend's own AgendaItem/
-- ActionItem.ownerName field (derived only from a profiles join) was
-- already dead for any non-linked owner. Add a real column to back it.
ALTER TABLE agenda_items ADD COLUMN owner_name text;
ALTER TABLE action_items ADD COLUMN owner_name text;
