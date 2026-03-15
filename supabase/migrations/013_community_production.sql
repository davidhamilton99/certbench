-- Community production readiness: atomic counters, moderation, denormalized counts

-- ============================================================
-- Atomic attempt counter (avoids read-then-write race condition)
-- ============================================================
CREATE OR REPLACE FUNCTION increment_attempt_count(set_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE user_study_sets
  SET attempt_count = attempt_count + 1
  WHERE id = set_id AND is_public = true;
$$;

-- ============================================================
-- Denormalized bookmark count on study sets
-- ============================================================
ALTER TABLE user_study_sets ADD COLUMN IF NOT EXISTS bookmark_count integer NOT NULL DEFAULT 0;

-- Backfill existing bookmark counts
UPDATE user_study_sets s
SET bookmark_count = (
  SELECT count(*)::integer FROM study_set_bookmarks b
  WHERE b.study_set_id = s.id
);

-- Trigger to keep bookmark_count in sync
CREATE OR REPLACE FUNCTION update_bookmark_count()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_study_sets
    SET bookmark_count = bookmark_count + 1
    WHERE id = NEW.study_set_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_study_sets
    SET bookmark_count = bookmark_count - 1
    WHERE id = OLD.study_set_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookmark_count ON study_set_bookmarks;
CREATE TRIGGER trg_bookmark_count
AFTER INSERT OR DELETE ON study_set_bookmarks
FOR EACH ROW EXECUTE FUNCTION update_bookmark_count();

-- ============================================================
-- Content moderation: reports table
-- ============================================================
CREATE TABLE IF NOT EXISTS community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  study_set_id uuid NOT NULL REFERENCES user_study_sets(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(reason) <= 1000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reports_pending ON community_reports (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_reports_set ON community_reports (study_set_id);

-- Users can report (insert) and read their own reports
ALTER TABLE community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reports" ON community_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users read own reports" ON community_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins can manage all reports (via service role key)

-- Unique constraint: one report per user per set (prevent spam)
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_per_user
  ON community_reports (reporter_id, study_set_id);
