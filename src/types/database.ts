// Manual type definitions matching the database schema.
// Once migrations are run, these can be replaced with auto-generated types:
// npx supabase gen types typescript --project-id mdvkidwkjjfgfwkogqvq > src/types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          role: "user" | "admin";
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          avatar_url?: string | null;
          role?: "user" | "admin";
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          role?: "user" | "admin";
          onboarding_completed?: boolean;
          updated_at?: string;
        };
      };
      certifications: {
        Row: {
          id: string;
          slug: string;
          name: string;
          exam_code: string;
          vendor: string;
          total_exam_questions: number;
          passing_score: number;
          max_score: number;
          exam_duration_minutes: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          exam_code: string;
          vendor: string;
          total_exam_questions: number;
          passing_score: number;
          max_score: number;
          exam_duration_minutes: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          exam_code?: string;
          vendor?: string;
          total_exam_questions?: number;
          passing_score?: number;
          max_score?: number;
          exam_duration_minutes?: number;
          is_active?: boolean;
        };
      };
      cert_domains: {
        Row: {
          id: string;
          certification_id: string;
          domain_number: string;
          title: string;
          exam_weight: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          certification_id: string;
          domain_number: string;
          title: string;
          exam_weight: number;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          certification_id?: string;
          domain_number?: string;
          title?: string;
          exam_weight?: number;
          sort_order?: number;
        };
      };
      cert_sub_objectives: {
        Row: {
          id: string;
          domain_id: string;
          code: string;
          title: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          domain_id: string;
          code: string;
          title: string;
          sort_order: number;
          created_at?: string;
        };
        Update: {
          domain_id?: string;
          code?: string;
          title?: string;
          sort_order?: number;
        };
      };
      cert_questions: {
        Row: {
          id: string;
          certification_id: string;
          domain_id: string;
          sub_objective_id: string | null;
          question_text: string;
          options: Json;
          correct_index: number;
          explanation: string;
          difficulty: number;
          is_active: boolean;
          is_diagnostic_eligible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          certification_id: string;
          domain_id: string;
          sub_objective_id?: string | null;
          question_text: string;
          options: Json;
          correct_index: number;
          explanation: string;
          difficulty?: number;
          is_active?: boolean;
          is_diagnostic_eligible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          certification_id?: string;
          domain_id?: string;
          sub_objective_id?: string | null;
          question_text?: string;
          options?: Json;
          correct_index?: number;
          explanation?: string;
          difficulty?: number;
          is_active?: boolean;
          is_diagnostic_eligible?: boolean;
        };
      };
      user_enrollments: {
        Row: {
          id: string;
          user_id: string;
          certification_id: string;
          exam_date: string | null;
          enrolled_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          certification_id: string;
          exam_date?: string | null;
          enrolled_at?: string;
          is_active?: boolean;
        };
        Update: {
          user_id?: string;
          certification_id?: string;
          exam_date?: string | null;
          is_active?: boolean;
        };
      };
      diagnostic_attempts: {
        Row: {
          id: string;
          user_id: string;
          certification_id: string;
          started_at: string;
          completed_at: string | null;
          total_questions: number;
          correct_count: number | null;
          is_complete: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          certification_id: string;
          started_at?: string;
          completed_at?: string | null;
          total_questions: number;
          correct_count?: number | null;
          is_complete?: boolean;
        };
        Update: {
          completed_at?: string | null;
          correct_count?: number | null;
          is_complete?: boolean;
        };
      };
      diagnostic_responses: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_index: number;
          is_correct: boolean;
          time_spent_seconds: number | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_index: number;
          is_correct: boolean;
          time_spent_seconds?: number | null;
          answered_at?: string;
        };
        Update: {
          selected_index?: number;
          is_correct?: boolean;
          time_spent_seconds?: number | null;
        };
      };
      practice_exam_attempts: {
        Row: {
          id: string;
          user_id: string;
          certification_id: string;
          exam_type: "full" | "domain_drill" | "weak_points";
          domain_id: string | null;
          started_at: string;
          completed_at: string | null;
          total_questions: number;
          correct_count: number | null;
          is_complete: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          certification_id: string;
          exam_type?: "full" | "domain_drill" | "weak_points";
          domain_id?: string | null;
          started_at?: string;
          completed_at?: string | null;
          total_questions: number;
          correct_count?: number | null;
          is_complete?: boolean;
        };
        Update: {
          exam_type?: "full" | "domain_drill" | "weak_points";
          domain_id?: string | null;
          completed_at?: string | null;
          correct_count?: number | null;
          is_complete?: boolean;
        };
      };
      practice_exam_responses: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_index: number;
          is_correct: boolean;
          is_flagged: boolean;
          time_spent_seconds: number | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          selected_index: number;
          is_correct: boolean;
          is_flagged?: boolean;
          time_spent_seconds?: number | null;
          answered_at?: string;
        };
        Update: {
          selected_index?: number;
          is_correct?: boolean;
          is_flagged?: boolean;
          time_spent_seconds?: number | null;
        };
      };
      question_performance: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          certification_id: string;
          times_seen: number;
          times_correct: number;
          last_seen_at: string | null;
          last_correct_at: string | null;
          srs_interval_days: number;
          srs_ease_factor: number;
          srs_next_review_at: string | null;
          streak: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          certification_id: string;
          times_seen?: number;
          times_correct?: number;
          last_seen_at?: string | null;
          last_correct_at?: string | null;
          srs_interval_days?: number;
          srs_ease_factor?: number;
          srs_next_review_at?: string | null;
          streak?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          times_seen?: number;
          times_correct?: number;
          last_seen_at?: string | null;
          last_correct_at?: string | null;
          srs_interval_days?: number;
          srs_ease_factor?: number;
          srs_next_review_at?: string | null;
          streak?: number;
        };
      };
      readiness_snapshots: {
        Row: {
          id: string;
          user_id: string;
          certification_id: string;
          overall_score: number;
          domain_scores: Json;
          total_questions_seen: number;
          is_preliminary: boolean;
          computed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          certification_id: string;
          overall_score: number;
          domain_scores: Json;
          total_questions_seen: number;
          is_preliminary?: boolean;
          computed_at?: string;
        };
        Update: {
          overall_score?: number;
          domain_scores?: Json;
          total_questions_seen?: number;
          is_preliminary?: boolean;
        };
      };
      user_study_sets: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: string | null;
          is_public: boolean;
          source_material_preview: string | null;
          question_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          is_public?: boolean;
          source_material_preview?: string | null;
          question_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          category?: string | null;
          is_public?: boolean;
          source_material_preview?: string | null;
          question_count?: number;
        };
      };
      user_study_questions: {
        Row: {
          id: string;
          study_set_id: string;
          user_id: string;
          question_text: string;
          options: Json;
          correct_index: number;
          explanation: string | null;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          study_set_id: string;
          user_id: string;
          question_text: string;
          options: Json;
          correct_index: number;
          explanation?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          question_text?: string;
          options?: Json;
          correct_index?: number;
          explanation?: string | null;
          sort_order?: number;
        };
      };
      study_set_bookmarks: {
        Row: {
          user_id: string;
          study_set_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          study_set_id: string;
          created_at?: string;
        };
        Update: {
          created_at?: string;
        };
      };
      study_set_cert_tags: {
        Row: {
          study_set_id: string;
          certification_slug: string;
        };
        Insert: {
          study_set_id: string;
          certification_slug: string;
        };
        Update: {
          study_set_id?: string;
          certification_slug?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
