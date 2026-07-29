export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          code: string
          criteria: string
          description: string
          icon: string
          id: string
          name: string
        }
        Insert: {
          code: string
          criteria: string
          description: string
          icon?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          criteria?: string
          description?: string
          icon?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          label: string
          resource_type: string
          topic_id: string | null
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          resource_type?: string
          topic_id?: string | null
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          resource_type?: string
          topic_id?: string | null
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          avg_questions: number
          class_level: number
          id: string
          name: string
          slug: string
          sort_order: number
          subject_id: string
          syllabus_year: number
          unit_id: string
          weightage_score: number
        }
        Insert: {
          avg_questions?: number
          class_level?: number
          id?: string
          name: string
          slug: string
          sort_order?: number
          subject_id: string
          syllabus_year?: number
          unit_id: string
          weightage_score?: number
        }
        Update: {
          avg_questions?: number
          class_level?: number
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          subject_id?: string
          syllabus_year?: number
          unit_id?: string
          weightage_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      cutoff_data: {
        Row: {
          category: string
          closing_rank: number
          closing_score: number | null
          college_name: string
          course: string
          id: string
          quota: string
          state: string | null
          year: number
        }
        Insert: {
          category?: string
          closing_rank: number
          closing_score?: number | null
          college_name: string
          course?: string
          id?: string
          quota?: string
          state?: string | null
          year: number
        }
        Update: {
          category?: string
          closing_rank?: number
          closing_score?: number | null
          college_name?: string
          course?: string
          id?: string
          quota?: string
          state?: string | null
          year?: number
        }
        Relationships: []
      }
      doubt_journal: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          question: string
          resolved_at: string | null
          status: string
          topic_id: string | null
          user_id: string
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          question: string
          resolved_at?: string | null
          status?: string
          topic_id?: string | null
          user_id: string
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          question?: string
          resolved_at?: string | null
          status?: string
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "doubt_journal_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          attempt_id: string | null
          converted_to_flashcard: boolean
          created_at: string
          id: string
          mistake_type: Database["public"]["Enums"]["mistake_type"]
          note: string | null
          question_id: string | null
          resolved: boolean
          topic_id: string | null
          user_id: string
        }
        Insert: {
          attempt_id?: string | null
          converted_to_flashcard?: boolean
          created_at?: string
          id?: string
          mistake_type?: Database["public"]["Enums"]["mistake_type"]
          note?: string | null
          question_id?: string | null
          resolved?: boolean
          topic_id?: string | null
          user_id: string
        }
        Update: {
          attempt_id?: string | null
          converted_to_flashcard?: boolean
          created_at?: string
          id?: string
          mistake_type?: Database["public"]["Enums"]["mistake_type"]
          note?: string | null
          question_id?: string | null
          resolved?: boolean
          topic_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_log_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_log_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_log_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_reviews: {
        Row: {
          ease_factor: number
          flashcard_id: string
          id: string
          interval_days: number
          next_review_at: string | null
          rating: number
          reviewed_at: string
          user_id: string
        }
        Insert: {
          ease_factor?: number
          flashcard_id: string
          id?: string
          interval_days?: number
          next_review_at?: string | null
          rating: number
          reviewed_at?: string
          user_id: string
        }
        Update: {
          ease_factor?: number
          flashcard_id?: string
          id?: string
          interval_days?: number
          next_review_at?: string | null
          rating?: number
          reviewed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_reviews_flashcard_id_fkey"
            columns: ["flashcard_id"]
            isOneToOne: false
            referencedRelation: "flashcards"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          back: string
          created_at: string
          deck_id: string | null
          ease_factor: number
          front: string
          id: string
          image_url: string | null
          interval_days: number
          next_review_at: string
          repetitions: number
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          back: string
          created_at?: string
          deck_id?: string | null
          ease_factor?: number
          front: string
          id?: string
          image_url?: string | null
          interval_days?: number
          next_review_at?: string
          repetitions?: number
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          back?: string
          created_at?: string
          deck_id?: string | null
          ease_factor?: number
          front?: string
          id?: string
          image_url?: string | null
          interval_days?: number
          next_review_at?: string
          repetitions?: number
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flashcards_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      habit_logs: {
        Row: {
          created_at: string
          id: string
          log_date: string
          mood: number | null
          note: string | null
          pomodoro_count: number
          sleep_hours: number | null
          study_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          log_date?: string
          mood?: number | null
          note?: string | null
          pomodoro_count?: number
          sleep_hours?: number | null
          study_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          log_date?: string
          mood?: number | null
          note?: string | null
          pomodoro_count?: number
          sleep_hours?: number | null
          study_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          content: Json
          created_at: string
          id: string
          is_pinned: boolean
          subject_id: string | null
          title: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          is_pinned?: boolean
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          is_pinned?: boolean
          subject_id?: string | null
          title?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      parent_links: {
        Row: {
          accepted_at: string | null
          id: string
          invited_at: string
          parent_email: string | null
          parent_user_id: string | null
          student_user_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          parent_email?: string | null
          parent_user_id?: string | null
          student_user_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          invited_at?: string
          parent_email?: string | null
          parent_user_id?: string | null
          student_user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          attempt_type: Database["public"]["Enums"]["attempt_type"] | null
          avatar_url: string | null
          category: string | null
          coaching_institute: string | null
          created_at: string
          exam_date: string | null
          full_name: string | null
          id: string
          is_admin: boolean
          onboarding_completed: boolean
          quota: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          target_exam_year: number
          theme: string
          updated_at: string
        }
        Insert: {
          attempt_type?: Database["public"]["Enums"]["attempt_type"] | null
          avatar_url?: string | null
          category?: string | null
          coaching_institute?: string | null
          created_at?: string
          exam_date?: string | null
          full_name?: string | null
          id: string
          is_admin?: boolean
          onboarding_completed?: boolean
          quota?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          target_exam_year?: number
          theme?: string
          updated_at?: string
        }
        Update: {
          attempt_type?: Database["public"]["Enums"]["attempt_type"] | null
          avatar_url?: string | null
          category?: string | null
          coaching_institute?: string | null
          created_at?: string
          exam_date?: string | null
          full_name?: string | null
          id?: string
          is_admin?: boolean
          onboarding_completed?: boolean
          quota?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          target_exam_year?: number
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          chapter_id: string | null
          correct_option: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          is_pyq: boolean
          options: Json
          pyq_year: number | null
          question_text: string
          subject_id: string | null
          topic_id: string | null
        }
        Insert: {
          chapter_id?: string | null
          correct_option?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          is_pyq?: boolean
          options?: Json
          pyq_year?: number | null
          question_text: string
          subject_id?: string | null
          topic_id?: string | null
        }
        Update: {
          chapter_id?: string | null
          correct_option?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          is_pyq?: boolean
          options?: Json
          pyq_year?: number | null
          question_text?: string
          subject_id?: string | null
          topic_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      rank_predictions: {
        Row: {
          based_on_score: number
          category: string | null
          created_at: string
          id: string
          narrative: string | null
          predicted_percentile: number
          rank_high: number
          rank_low: number
          user_id: string
        }
        Insert: {
          based_on_score: number
          category?: string | null
          created_at?: string
          id?: string
          narrative?: string | null
          predicted_percentile: number
          rank_high: number
          rank_low: number
          user_id: string
        }
        Update: {
          based_on_score?: number
          category?: string | null
          created_at?: string
          id?: string
          narrative?: string | null
          predicted_percentile?: number
          rank_high?: number
          rank_low?: number
          user_id?: string
        }
        Relationships: []
      }
      study_blocks: {
        Row: {
          block_date: string
          created_at: string
          duration_minutes: number
          id: string
          is_recurring: boolean
          notes: string | null
          plan_id: string | null
          start_minute: number
          status: Database["public"]["Enums"]["block_status"]
          title: string
          topic_id: string | null
          type: Database["public"]["Enums"]["block_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          block_date?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_recurring?: boolean
          notes?: string | null
          plan_id?: string | null
          start_minute?: number
          status?: Database["public"]["Enums"]["block_status"]
          title: string
          topic_id?: string | null
          type?: Database["public"]["Enums"]["block_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          block_date?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          is_recurring?: boolean
          notes?: string | null
          plan_id?: string | null
          start_minute?: number
          status?: Database["public"]["Enums"]["block_status"]
          title?: string
          topic_id?: string | null
          type?: Database["public"]["Enums"]["block_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_blocks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "study_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_blocks_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      study_plans: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          plan_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          plan_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          plan_date?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color_token: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          syllabus_year: number
        }
        Insert: {
          color_token: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          syllabus_year?: number
        }
        Update: {
          color_token?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          syllabus_year?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan_tier: Database["public"]["Enums"]["subscription_tier"]
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_tier?: Database["public"]["Enums"]["subscription_tier"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan_tier?: Database["public"]["Enums"]["subscription_tier"]
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      test_answers: {
        Row: {
          attempt_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          marked_for_review: boolean
          question_id: string
          selected_option: number | null
          time_spent_seconds: number
          user_id: string
        }
        Insert: {
          attempt_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          question_id: string
          selected_option?: number | null
          time_spent_seconds?: number
          user_id: string
        }
        Update: {
          attempt_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          marked_for_review?: boolean
          question_id?: string
          selected_option?: number | null
          time_spent_seconds?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          accuracy: number
          correct_count: number
          created_at: string
          id: string
          incorrect_count: number
          max_score: number
          score: number
          started_at: string
          status: string
          subject_breakdown: Json
          submitted_at: string | null
          test_id: string | null
          time_taken_seconds: number
          title: string
          unattempted_count: number
          user_id: string
        }
        Insert: {
          accuracy?: number
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          max_score?: number
          score?: number
          started_at?: string
          status?: string
          subject_breakdown?: Json
          submitted_at?: string | null
          test_id?: string | null
          time_taken_seconds?: number
          title?: string
          unattempted_count?: number
          user_id: string
        }
        Update: {
          accuracy?: number
          correct_count?: number
          created_at?: string
          id?: string
          incorrect_count?: number
          max_score?: number
          score?: number
          started_at?: string
          status?: string
          subject_breakdown?: Json
          submitted_at?: string | null
          test_id?: string | null
          time_taken_seconds?: number
          title?: string
          unattempted_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          id: string
          position: number
          question_id: string
          test_id: string
        }
        Insert: {
          id?: string
          position?: number
          question_id: string
          test_id: string
        }
        Update: {
          id?: string
          position?: number
          question_id?: string
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          config: Json
          created_at: string
          duration_minutes: number
          id: string
          is_public: boolean
          scheduled_for: string | null
          title: string
          total_questions: number
          type: Database["public"]["Enums"]["test_type"]
          user_id: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          duration_minutes?: number
          id?: string
          is_public?: boolean
          scheduled_for?: string | null
          title: string
          total_questions?: number
          type?: Database["public"]["Enums"]["test_type"]
          user_id?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          duration_minutes?: number
          id?: string
          is_public?: boolean
          scheduled_for?: string | null
          title?: string
          total_questions?: number
          type?: Database["public"]["Enums"]["test_type"]
          user_id?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          chapter_id: string
          difficulty: string
          estimated_minutes: number
          id: string
          name: string
          ncert_reference: string | null
          slug: string
          sort_order: number
          syllabus_year: number
        }
        Insert: {
          chapter_id: string
          difficulty?: string
          estimated_minutes?: number
          id?: string
          name: string
          ncert_reference?: string | null
          slug: string
          sort_order?: number
          syllabus_year?: number
        }
        Update: {
          chapter_id?: string
          difficulty?: string
          estimated_minutes?: number
          id?: string
          name?: string
          ncert_reference?: string | null
          slug?: string
          sort_order?: number
          syllabus_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          id: string
          name: string
          slug: string
          sort_order: number
          subject_id: string
          syllabus_year: number
        }
        Insert: {
          id?: string
          name: string
          slug: string
          sort_order?: number
          subject_id: string
          syllabus_year?: number
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          subject_id?: string
          syllabus_year?: number
        }
        Relationships: [
          {
            foreignKeyName: "units_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_topic_progress: {
        Row: {
          confidence_rating: number
          created_at: string
          id: string
          last_studied_at: string | null
          next_revision_due_at: string | null
          revision_count: number
          status: Database["public"]["Enums"]["topic_status"]
          topic_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence_rating?: number
          created_at?: string
          id?: string
          last_studied_at?: string | null
          next_revision_due_at?: string | null
          revision_count?: number
          status?: Database["public"]["Enums"]["topic_status"]
          topic_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence_rating?: number
          created_at?: string
          id?: string
          last_studied_at?: string | null
          next_revision_due_at?: string | null
          revision_count?: number
          status?: Database["public"]["Enums"]["topic_status"]
          topic_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_topic_progress_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "student"
      attempt_type: "class_11" | "class_12" | "dropper" | "repeater"
      block_status: "planned" | "in_progress" | "completed" | "skipped"
      block_type:
        | "study"
        | "revision"
        | "practice"
        | "mock_test"
        | "break"
        | "coaching"
        | "custom"
      mistake_type:
        | "conceptual"
        | "silly"
        | "calculation"
        | "time_pressure"
        | "misread"
        | "guessed"
        | "unattempted"
      subscription_tier: "free" | "premium" | "premium_plus"
      test_type: "full_mock" | "chapter_wise" | "custom" | "pyq" | "diagnostic"
      topic_status:
        | "not_started"
        | "in_progress"
        | "completed"
        | "revised"
        | "mastered"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "student"],
      attempt_type: ["class_11", "class_12", "dropper", "repeater"],
      block_status: ["planned", "in_progress", "completed", "skipped"],
      block_type: [
        "study",
        "revision",
        "practice",
        "mock_test",
        "break",
        "coaching",
        "custom",
      ],
      mistake_type: [
        "conceptual",
        "silly",
        "calculation",
        "time_pressure",
        "misread",
        "guessed",
        "unattempted",
      ],
      subscription_tier: ["free", "premium", "premium_plus"],
      test_type: ["full_mock", "chapter_wise", "custom", "pyq", "diagnostic"],
      topic_status: [
        "not_started",
        "in_progress",
        "completed",
        "revised",
        "mastered",
      ],
    },
  },
} as const
