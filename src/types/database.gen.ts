// Database types — STOPGAP copy pending first `npm run db:types` run.
//
// Regenerate with:   npm run db:types   (writes this file)
// CI drift check:    npm run db:types:check
//
// Derived from the previous hand-maintained types plus the tables/columns
// they had drifted from (user_subscriptions, ai_generation_usage,
// question_flags, migration-016 progress columns, migration-020 rate limits).
// Replace wholesale with generated output in Phase 2.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

interface DatabaseGenerated {
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
          progress_state: Json | null;
          progress_saved_at: string | null;
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
          progress_state?: Json | null;
          progress_saved_at?: string | null;
        };
        Update: {
          completed_at?: string | null;
          correct_count?: number | null;
          is_complete?: boolean;
          progress_state?: Json | null;
          progress_saved_at?: string | null;
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
          progress_state: Json | null;
          progress_saved_at: string | null;
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
          progress_state?: Json | null;
          progress_saved_at?: string | null;
        };
        Update: {
          exam_type?: "full" | "domain_drill" | "weak_points";
          domain_id?: string | null;
          completed_at?: string | null;
          correct_count?: number | null;
          is_complete?: boolean;
          progress_state?: Json | null;
          progress_saved_at?: string | null;
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
          suspended_at: string | null;
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
          suspended_at?: string | null;
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
          suspended_at?: string | null;
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
      question_flags: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          reason: string | null;
          status: "pending" | "actioned" | "dismissed";
          admin_notes: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          reason?: string | null;
          status?: "pending" | "actioned" | "dismissed";
          admin_notes?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          reason?: string | null;
          status?: "pending" | "actioned" | "dismissed";
          admin_notes?: string | null;
          reviewed_at?: string | null;
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
          is_featured: boolean;
          attempt_count: number;
          bookmark_count: number;
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
          is_featured?: boolean;
          attempt_count?: number;
          bookmark_count?: number;
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
          is_featured?: boolean;
          attempt_count?: number;
          bookmark_count?: number;
        };
      };
      user_study_questions: {
        Row: {
          id: string;
          study_set_id: string;
          user_id: string;
          question_type:
            | "multiple_choice"
            | "true_false"
            | "multiple_select"
            | "ordering"
            | "matching";
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
          question_type?:
            | "multiple_choice"
            | "true_false"
            | "multiple_select"
            | "ordering"
            | "matching";
          question_text: string;
          options: Json;
          correct_index: number;
          explanation?: string | null;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          question_type?:
            | "multiple_choice"
            | "true_false"
            | "multiple_select"
            | "ordering"
            | "matching";
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
          domain_tag: string | null;
        };
        Insert: {
          study_set_id: string;
          certification_slug: string;
          domain_tag?: string | null;
        };
        Update: {
          study_set_id?: string;
          certification_slug?: string;
          domain_tag?: string | null;
        };
      };
      community_reports: {
        Row: {
          id: string;
          reporter_id: string;
          study_set_id: string;
          reason: string;
          status: "pending" | "reviewed" | "actioned" | "dismissed";
          admin_notes: string | null;
          created_at: string;
          reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          study_set_id: string;
          reason: string;
          status?: "pending" | "reviewed" | "actioned" | "dismissed";
          admin_notes?: string | null;
          created_at?: string;
          reviewed_at?: string | null;
        };
        Update: {
          reason?: string;
          status?: "pending" | "reviewed" | "actioned" | "dismissed";
          admin_notes?: string | null;
          reviewed_at?: string | null;
        };
      };
      study_set_progress: {
        Row: {
          user_id: string;
          study_set_id: string;
          current_index: number;
          correct_count: number;
          total_questions: number;
          saved_at: string;
        };
        Insert: {
          user_id: string;
          study_set_id: string;
          current_index?: number;
          correct_count?: number;
          total_questions: number;
          saved_at?: string;
        };
        Update: {
          current_index?: number;
          correct_count?: number;
          total_questions?: number;
          saved_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: "free" | "pro";
          status: "active" | "canceled" | "past_due" | "trialing";
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "pro";
          status?: "active" | "canceled" | "past_due" | "trialing";
          current_period_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: "free" | "pro";
          status?: "active" | "canceled" | "past_due" | "trialing";
          current_period_end?: string | null;
          updated_at?: string;
        };
      };
      ai_generation_usage: {
        Row: {
          id: string;
          user_id: string;
          month: string;
          generation_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          month: string;
          generation_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          generation_count?: number;
          updated_at?: string;
        };
      };
      rate_limit_buckets: {
        Row: {
          key: string;
          window_start: string;
          count: number;
        };
        Insert: {
          key: string;
          window_start: string;
          count: number;
        };
        Update: {
          window_start?: string;
          count?: number;
        };
      };
      email_preferences: {
        Row: {
          user_id: string;
          digest_enabled: boolean;
          unsubscribe_token: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          digest_enabled?: boolean;
          unsubscribe_token?: string;
          updated_at?: string;
        };
        Update: {
          digest_enabled?: boolean;
          updated_at?: string;
        };
      };
      email_log: {
        Row: {
          id: number;
          user_id: string;
          email_type: string;
          sent_on: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          email_type: string;
          sent_on?: string;
          created_at?: string;
        };
        Update: {
          email_type?: string;
        };
      };
      testimonials: {
        Row: {
          id: string;
          user_id: string;
          certification_id: string | null;
          passed: boolean;
          quote: string;
          display_name: string;
          status: "pending" | "approved" | "hidden";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          certification_id?: string | null;
          passed: boolean;
          quote: string;
          display_name: string;
          status?: "pending" | "approved" | "hidden";
          created_at?: string;
        };
        Update: {
          status?: "pending" | "approved" | "hidden";
          quote?: string;
          display_name?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_attempt_count: {
        Args: { set_id: string };
        Returns: undefined;
      };
      increment_generation_count: {
        Args: { p_user_id: string; p_month: string };
        Returns: undefined;
      };
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}

/**
 * supabase-js requires a `Relationships` array on every table to satisfy its
 * GenericTable constraint (queries silently type as `never` without it).
 * Real codegen emits these; this wrapper supplies empty ones until then.
 */
export type Database = {
  public: Omit<DatabaseGenerated["public"], "Tables"> & {
    Tables: {
      [K in keyof DatabaseGenerated["public"]["Tables"]]: DatabaseGenerated["public"]["Tables"][K] & {
        Relationships: [];
      };
    };
  };
};
