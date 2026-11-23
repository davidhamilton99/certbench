/** Question kinds supported by user study materials (AI-generated or imported). */
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

