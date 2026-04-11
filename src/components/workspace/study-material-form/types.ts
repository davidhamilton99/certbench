export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "multiple_select"
  | "ordering"
  | "matching";

export interface MCTFOption { text: string; is_correct: boolean }
export interface OrderingOption { text: string; correct_position: number }
export interface MatchingOption { left: string; right: string }

export interface GeneratedQuestion {
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
  correct_index: number;
  explanation?: string;
}

export type Phase = "form" | "generating" | "validating" | "review";

export interface UserPlan {
  plan: "free" | "pro";
  generationsUsed: number;
  generationsLimit: number | null;
  canGenerate: boolean;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  multiple_select: "Multi-Select",
  ordering: "Ordering",
  matching: "Matching",
};

export const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string; desc: string; icon: string }[] = [
  { value: "multiple_choice", label: "Multiple Choice", desc: "Pick one correct answer", icon: "A" },
  { value: "true_false", label: "True / False", desc: "Binary true or false", icon: "T" },
  { value: "multiple_select", label: "Multi-Select", desc: "Select all that apply", icon: "+" },
  { value: "ordering", label: "Ordering", desc: "Arrange in correct sequence", icon: "#" },
  { value: "matching", label: "Matching", desc: "Pair related items", icon: "=" },
];

export const DEFAULT_QUESTION_COUNT = 25;

export const ACCEPTED_FILE_TYPES = ".txt,.md,.csv,.tsv,.pdf,.docx,.png,.jpg,.jpeg,.webp";
export const PLAIN_TEXT_EXTENSIONS = ["txt", "md", "csv", "tsv"];
export const SERVER_PARSED_EXTENSIONS = ["pdf", "docx", "png", "jpg", "jpeg", "webp"];
export const ALL_EXTENSIONS = [...PLAIN_TEXT_EXTENSIONS, ...SERVER_PARSED_EXTENSIONS];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
