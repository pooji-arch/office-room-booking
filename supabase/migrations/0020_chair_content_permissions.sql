-- 0020_chair_content_permissions.sql
--
-- Requested directly: a meeting's Chair (a participant explicitly marked
-- with that role, distinct from a plain Participant) should get the same
-- content-editing rights as the organizer — agenda items, minutes, and
-- action items — but NOT the organizer-only actions: cancelling or
-- rescheduling the meeting itself, or adding/removing participants. Those
-- stay exactly as they are; only the four content tables below change.
--
-- is_meeting_chair() mirrors is_admin()'s existing pattern (a small,
-- reusable SECURITY DEFINER helper) rather than repeating the same EXISTS
-- subquery in every one of the twelve policies being touched here.
-- SECURITY DEFINER isn't strictly required, since meeting_participants
-- SELECT is already open to any authenticated user — but it matches this
-- project's existing convention for this class of permission-check helper
-- and stays correct even if that policy is ever tightened later.

BEGIN;

CREATE OR REPLACE FUNCTION is_meeting_chair(p_meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM meeting_participants mp
    WHERE mp.meeting_id = p_meeting_id
      AND mp.profile_id = auth.uid()
      AND mp.role = 'CHAIR'
  );
$function$;

-- agenda_items -----------------------------------------------------------

DROP POLICY IF EXISTS agenda_items_insert_organizer_or_admin ON agenda_items;
CREATE POLICY agenda_items_insert_organizer_or_admin ON agenda_items
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = agenda_items.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(agenda_items.meeting_id)
  );

DROP POLICY IF EXISTS agenda_items_update_organizer_or_admin ON agenda_items;
CREATE POLICY agenda_items_update_organizer_or_admin ON agenda_items
  FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = agenda_items.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(agenda_items.meeting_id)
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = agenda_items.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(agenda_items.meeting_id)
  );

DROP POLICY IF EXISTS agenda_items_delete_organizer_or_admin ON agenda_items;
CREATE POLICY agenda_items_delete_organizer_or_admin ON agenda_items
  FOR DELETE
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = agenda_items.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(agenda_items.meeting_id)
  );

-- minutes ------------------------------------------------------------------

DROP POLICY IF EXISTS minutes_insert_organizer_or_admin ON minutes;
CREATE POLICY minutes_insert_organizer_or_admin ON minutes
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = minutes.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(minutes.meeting_id)
  );

DROP POLICY IF EXISTS minutes_update_organizer_or_admin ON minutes;
CREATE POLICY minutes_update_organizer_or_admin ON minutes
  FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = minutes.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(minutes.meeting_id)
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = minutes.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(minutes.meeting_id)
  );

DROP POLICY IF EXISTS minutes_delete_organizer_or_admin ON minutes;
CREATE POLICY minutes_delete_organizer_or_admin ON minutes
  FOR DELETE
  USING (
    is_admin()
    OR EXISTS (SELECT 1 FROM meetings m WHERE m.id = minutes.meeting_id AND m.booked_by_id = auth.uid())
    OR is_meeting_chair(minutes.meeting_id)
  );

-- minutes_items (resolves meeting_id via minutes, same as the existing
-- policies already do) ------------------------------------------------

DROP POLICY IF EXISTS minutes_items_insert_organizer_or_admin ON minutes_items;
CREATE POLICY minutes_items_insert_organizer_or_admin ON minutes_items
  FOR INSERT
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_items.minutes_id AND m.booked_by_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM minutes mo
      WHERE mo.id = minutes_items.minutes_id AND is_meeting_chair(mo.meeting_id)
    )
  );

DROP POLICY IF EXISTS minutes_items_update_organizer_or_admin ON minutes_items;
CREATE POLICY minutes_items_update_organizer_or_admin ON minutes_items
  FOR UPDATE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_items.minutes_id AND m.booked_by_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM minutes mo
      WHERE mo.id = minutes_items.minutes_id AND is_meeting_chair(mo.meeting_id)
    )
  )
  WITH CHECK (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_items.minutes_id AND m.booked_by_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM minutes mo
      WHERE mo.id = minutes_items.minutes_id AND is_meeting_chair(mo.meeting_id)
    )
  );

DROP POLICY IF EXISTS minutes_items_delete_organizer_or_admin ON minutes_items;
CREATE POLICY minutes_items_delete_organizer_or_admin ON minutes_items
  FOR DELETE
  USING (
    is_admin()
    OR EXISTS (
      SELECT 1 FROM minutes mo JOIN meetings m ON m.id = mo.meeting_id
      WHERE mo.id = minutes_items.minutes_id AND m.booked_by_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM minutes mo
      WHERE mo.id = minutes_items.minutes_id AND is_meeting_chair(mo.meeting_id)
    )
  );

-- action_items policies are added in the next migration, once the
-- companion column-guard trigger (protect_action_item_owner_updates) is
-- also confirmed and updated in the same pass — that trigger has its own
-- "is admin or organizer" check that would otherwise silently downgrade a
-- Chair to owner-only partial edits even after RLS allows the row through.

COMMIT;
