-- Add in-progress state column to practice_exam_attempts for session resumption
ALTER TABLE practice_exam_attempts
ADD COLUMN IF NOT EXISTS progress_state jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS progress_saved_at timestamptz DEFAULT NULL;

-- Add in-progress state column to diagnostic_attempts
ALTER TABLE diagnostic_attempts
ADD COLUMN IF NOT EXISTS progress_state jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS progress_saved_at timestamptz DEFAULT NULL;

-- Index for finding incomplete attempts quickly
CREATE INDEX IF NOT EXISTS idx_practice_attempts_in_progress
ON practice_exam_attempts (user_id, certification_id, is_complete)
WHERE is_complete = false;

CREATE INDEX IF NOT EXISTS idx_diagnostic_attempts_in_progress
ON diagnostic_attempts (user_id, certification_id, is_complete)
WHERE is_complete = false;
