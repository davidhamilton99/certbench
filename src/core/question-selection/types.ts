export interface QuestionOption {
  text: string;
  is_correct: boolean;
}

export interface CertQuestion {
  id: string;
  certification_id: string;
  domain_id: string;
  sub_objective_id: string | null;
  question_text: string;
  options: QuestionOption[];
  correct_index: number;
  explanation: string;
  difficulty: number;
}

export interface QuestionPerformanceRecord {
  question_id: string;
  times_seen: number;
  times_correct: number;
  last_seen_at: string | null;
}

export interface DomainWeight {
  id: string;
  domain_number: string;
  title: string;
  exam_weight: number;
}
