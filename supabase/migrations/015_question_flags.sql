-- Question flags: users can flag cert questions for review
CREATE TABLE IF NOT EXISTS question_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  question_id uuid NOT NULL REFERENCES cert_questions(id) ON DELETE CASCADE,
  reason text CHECK (char_length(reason) <= 500),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'actioned', 'dismissed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

-- One flag per user per question
CREATE UNIQUE INDEX idx_question_flags_unique
  ON question_flags (user_id, question_id);

-- Admin queries: pending flags first
CREATE INDEX idx_question_flags_pending
  ON question_flags (status) WHERE status = 'pending';

-- RLS
ALTER TABLE question_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own flags" ON question_flags
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own flags" ON question_flags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users delete own flags" ON question_flags
  FOR DELETE USING (auth.uid() = user_id);
