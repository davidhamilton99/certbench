export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "multiple_select"
  | "ordering"
  | "matching";

export interface MCTFOption {
  text: string;
  is_correct: boolean;
}
export interface OrderingOption {
  text: string;
  correct_position: number;
}
export interface MatchingOption {
  left: string;
  right: string;
}

export const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  multiple_select: "Multi-Select",
  ordering: "Ordering",
  matching: "Matching",
};

export interface StudySet {
  id: string;
  user_id: string;
  title: string;
  category: string | null;
  question_count: number;
  is_public: boolean;
  created_at: string;
  source_material_preview?: string | null;
}

export interface StudyQuestion {
  id: string;
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
  correct_index: number;
  explanation: string | null;
  sort_order: number;
}

export type Phase = "overview" | "practicing" | "revealed" | "complete";
