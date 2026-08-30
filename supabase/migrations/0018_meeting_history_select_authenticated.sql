-- 0018_meeting_history_select_authenticated.sql
--
-- meeting_history's only SELECT policy (booking_history_select_admin,
-- named from this table's earlier life as booking_history in Phase 1)
-- restricted reads to is_admin() only — confirmed live: an organizer
-- querying their own meeting's history got 0 rows back, while an admin
-- querying the exact same meeting got the full, correctly-accumulating
-- history. Every other meeting sub-resource in this schema (meetings,
-- meeting_participants, agenda_items, action_items, minutes) is already
-- open-read to any authenticated user — meeting_history was the one
-- leftover outlier from before this table got reused for the Meeting
-- Management System rebuild. This is exactly the same class of gap as the
-- profiles SELECT RLS bug fixed in 0006, for the same reason: it broke a
-- real feature (a user's own "Reschedule History" card, both on the full
-- meeting details page and the Calendar View popup) for every non-admin.
--
-- No new authorization boundary is being introduced — meetings themselves
-- are already readable by any authenticated employee, so their history is
-- not more sensitive than the meeting itself.

BEGIN;

DROP POLICY IF EXISTS booking_history_select_admin ON meeting_history;

CREATE POLICY meeting_history_select_authenticated ON meeting_history
  FOR SELECT USING (auth.role() = 'authenticated');

COMMIT;
