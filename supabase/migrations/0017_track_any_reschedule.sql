-- 0017_track_any_reschedule.sql
--
-- meetingDisplayStatus() only ever checked reassigned_at to decide whether a
-- meeting reads as "Rescheduled" instead of "Confirmed" — but reassigned_at
-- (along with reassigned_by_name/reassignment_reason) is protected by an
-- existing column-guard trigger that ONLY an admin can write to (confirmed
-- live: a plain organizer's own self-service reschedule gets rejected
-- outright with "You may only cancel or reschedule your own booking" the
-- moment it touches either of those two columns, even on their own
-- meeting). So a user rescheduling their own meeting correctly moved the
-- date/time, but had no way to ever flip the display status — it read
-- "Confirmed" forever despite genuinely having reschedule history.
--
-- rescheduled_at is a new, deliberately UNPROTECTED column — any organizer
-- or admin can set it — used purely to answer "has this meeting's schedule
-- ever changed, by anyone" for display purposes. reassigned_at/
-- reassigned_by_name/reassignment_reason are untouched and still mean
-- exactly what they meant before: specifically an ADMIN override, shown in
-- its own "Reassigned by {name}" banner. The two concepts are related but
-- not the same thing, which is why this is a new column rather than
-- loosening the existing protected ones.

BEGIN;

ALTER TABLE meetings ADD COLUMN rescheduled_at timestamptz;

COMMIT;
