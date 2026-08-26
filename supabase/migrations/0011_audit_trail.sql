-- 0011_audit_trail.sql
--
-- Day 6 of the Meeting Management System Phase 2 build: Management Reporting
-- Dashboard's "Audit trail surfacing" requirement — MOM edits (minutes_
-- revisions) and action-item status changes made visible in the UI,
-- extending the Phase 1 meeting_history pattern.
--
-- Two gaps closed here:
-- 1. There was no table at all tracking action-item status changes — only
--    the current status was ever stored. New action_item_status_history,
--    written only by an AFTER UPDATE SECURITY DEFINER trigger (mirrors
--    record_meeting_history()'s Phase 1 pattern) — no INSERT policy for
--    authenticated, same "RLS for row access, trigger for writes" split
--    used everywhere else in this project. changed_by_name is snapshotted
--    at write time (not live-joined), matching meeting_history's own
--    convention, so a later profile deletion can't blank out who did it.
-- 2. minutes_revisions (schema-only since Day 2 / 0002) has never had
--    anything write to it, because there was no "edit already-finalized
--    minutes" flow at all — canEdit in MinutesCard.tsx is unconditionally
--    false once status is FINAL. edit_finalized_minutes_item() is the new
--    entry point: a SECURITY DEFINER RPC (needed because it has to do the
--    minutes_items UPDATE and the minutes_revisions INSERT as one atomic
--    unit, and reason is only known to the caller, not derivable from a
--    plain row diff). Gated to organizer/admin and to genuinely-FINAL
--    minutes only — a still-DRAFT entry doesn't need reason-tracking, and
--    editing one isn't in scope for this pass.

BEGIN;

-- ============================================================
-- 1. action_item_status_history
-- ============================================================
CREATE TABLE action_item_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id uuid NOT NULL REFERENCES action_items(id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  changed_by uuid REFERENCES profiles(id),
  changed_by_name text,
  previous_status action_item_status NOT NULL,
  new_status action_item_status NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX action_item_status_history_meeting_id_idx ON action_item_status_history(meeting_id);
CREATE INDEX action_item_status_history_changed_at_idx ON action_item_status_history(changed_at DESC);

ALTER TABLE action_item_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY action_item_status_history_select_authenticated
  ON action_item_status_history FOR SELECT
  USING (auth.role() = 'authenticated');

-- No INSERT/UPDATE/DELETE policy — rows only ever come from the trigger below.

CREATE OR REPLACE FUNCTION record_action_item_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_name text;
begin
  if NEW.status IS DISTINCT FROM OLD.status then
    SELECT name INTO v_name FROM profiles WHERE id = auth.uid();
    INSERT INTO action_item_status_history
      (action_item_id, meeting_id, changed_by, changed_by_name, previous_status, new_status)
    VALUES
      (NEW.id, NEW.meeting_id, auth.uid(), v_name, OLD.status, NEW.status);
  end if;
  return NEW;
end;
$function$;

CREATE TRIGGER record_action_item_status_history_after_update
  AFTER UPDATE ON action_items
  FOR EACH ROW EXECUTE FUNCTION record_action_item_status_history();

-- ============================================================
-- 2. Edit-finalized-minutes RPC — populates minutes_revisions (0002)
-- ============================================================
CREATE OR REPLACE FUNCTION edit_finalized_minutes_item(
  p_item_id uuid, p_topic text, p_notes text, p_decision text, p_reason text
) RETURNS minutes_items
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
  v_minutes_id uuid;
  v_meeting_id uuid;
  v_status minutes_status;
  v_old_topic text;
  v_result minutes_items;
begin
  SELECT mi.minutes_id, mi.topic, m.meeting_id, m.status
    INTO v_minutes_id, v_old_topic, v_meeting_id, v_status
  FROM minutes_items mi JOIN minutes m ON m.id = mi.minutes_id
  WHERE mi.id = p_item_id;

  if v_minutes_id IS NULL then
    RAISE EXCEPTION 'Minutes entry not found.';
  end if;

  if NOT (
    is_admin() OR EXISTS (SELECT 1 FROM meetings mt WHERE mt.id = v_meeting_id AND mt.booked_by_id = auth.uid())
  ) then
    RAISE EXCEPTION 'Only the organizer or an admin can edit minutes.';
  end if;

  if v_status <> 'FINAL' then
    RAISE EXCEPTION 'This entry is still a draft — edit it directly instead of using reason-tracked edit.';
  end if;

  if p_reason IS NULL OR btrim(p_reason) = '' then
    RAISE EXCEPTION 'A reason is required to edit finalized minutes.';
  end if;

  UPDATE minutes_items
  SET topic = p_topic, notes = p_notes, decision = p_decision
  WHERE id = p_item_id
  RETURNING * INTO v_result;

  INSERT INTO minutes_revisions (minutes_id, author_id, reason, change_summary)
  VALUES (v_minutes_id, auth.uid(), p_reason, 'Topic: "' || v_old_topic || '" -> "' || p_topic || '"');

  return v_result;
end;
$function$;

COMMIT;
