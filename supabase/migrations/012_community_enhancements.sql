-- Community enhancements: featured flag, domain tags, attempt tracking

-- Staff picks / featured sets
ALTER TABLE user_study_sets ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

-- Domain tag on cert tags (e.g. "2.0 - Network Infrastructure")
ALTER TABLE study_set_cert_tags ADD COLUMN IF NOT EXISTS domain_tag text;

-- Track total attempts on a study set for popularity sorting
ALTER TABLE user_study_sets ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;

-- Index for featured sets
CREATE INDEX IF NOT EXISTS idx_study_sets_featured ON user_study_sets (is_featured) WHERE is_featured = true;

-- Index for public sets by attempt_count (popularity sort)
CREATE INDEX IF NOT EXISTS idx_study_sets_popularity ON user_study_sets (attempt_count DESC) WHERE is_public = true;
