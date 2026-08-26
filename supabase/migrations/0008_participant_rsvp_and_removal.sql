-- 0008_participant_rsvp_and_removal.sql
--
-- Closes a real gap: a participant currently has no way to respond to their
-- own invite — meeting_participants only has an organizer/admin UPDATE
-- policy (0001), so an invited person can never move their own rsvp_status
-- off PENDING. This adds a second permissive UPDATE policy letting a
-- participant touch their own row, but RLS policies can't diff OLD vs NEW to
-- restrict WHICH columns changed — so a bare "profile_id = auth.uid()"
-- policy would also let them silently reassign their own row to CHAIR, or
-- re-point it at a meeting they were never added to. protect_participant_
-- columns() closes that hole the same way trg_protect_booking_columns
-- already does for meetings (Phase 1): a BEFORE UPDATE trigger that allows
-- admins/organizers to change anything, but restricts everyone else to
-- rsvp_status only.
--
-- Participant removal needs no new policy — meeting_participants_delete_
-- organizer_or_admin (0001) already covers it; only the UI/service layer is
-- missing, added alongside this migration.

BEGIN;

CREATE POLICY meeting_participants_update_own_rsvp
  ON meeting_participants FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE OR REPLACE FUNCTION protect_participant_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
  if is_admin() then
    return NEW;
  end if;

  if EXISTS (
    SELECT 1 FROM meetings m WHERE m.id = NEW.meeting_id AND m.booked_by_id = auth.uid()
  ) then
    return NEW;
  end if;

  if NEW.meeting_id IS DISTINCT FROM OLD.meeting_id
     OR NEW.profile_id IS DISTINCT FROM OLD.profile_id
     OR NEW.external_name IS DISTINCT FROM OLD.external_name
     OR NEW.external_email IS DISTINCT FROM OLD.external_email
     OR NEW.external_organization IS DISTINCT FROM OLD.external_organization
     OR NEW.role IS DISTINCT FROM OLD.role
  then
    RAISE EXCEPTION 'You can only update your own RSVP status.';
  end if;

  return NEW;
end;
$function$;

CREATE TRIGGER protect_participant_columns_before_update
  BEFORE UPDATE ON meeting_participants
  FOR EACH ROW EXECUTE FUNCTION protect_participant_columns();

-- ============================================================
-- Resend-invite RPC — the "Invite" button next to an already-added
-- participant. There is no email vendor wired up in this project (see
-- 0007's own notes), so this nudges the same in-app inbox the original
-- PARTICIPANT_ADDED trigger writes to. A plain client INSERT into
-- notifications is impossible by design (no INSERT policy — 0007), so this
-- has to be a SECURITY DEFINER function, not a service-layer insert.
-- ============================================================
CREATE OR REPLACE FUNCTION resend_participant_invite(p_participant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_meeting_id uuid;
  v_profile_id uuid;
  v_title text;
  v_purpose text;
begin
  SELECT meeting_id, profile_id INTO v_meeting_id, v_profile_id
  FROM meeting_participants WHERE id = p_participant_id;

  if v_meeting_id IS NULL then
    RAISE EXCEPTION 'Participant not found.';
  end if;

  if NOT (
    is_admin() OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = v_meeting_id AND m.booked_by_id = auth.uid())
  ) then
    RAISE EXCEPTION 'Only the organizer or an admin can resend an invite.';
  end if;

  -- External (non-profile) participants have no in-app inbox to notify.
  if v_profile_id IS NULL then
    RETURN;
  end if;

  SELECT title, purpose INTO v_title, v_purpose FROM meetings WHERE id = v_meeting_id;

  INSERT INTO notifications (recipient_id, type, title, message, link, meeting_id)
  VALUES (
    v_profile_id, 'PARTICIPANT_ADDED', 'Meeting invite reminder',
    'Reminder: please RSVP for "' || COALESCE(v_title, v_purpose, 'a meeting') || '".',
    '/meetings/' || v_meeting_id, v_meeting_id
  );
end;
$function$;

COMMIT;
