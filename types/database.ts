export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          slug: string;
          industry: Database["public"]["Enums"]["industry_type"];
          phone: string | null;
          email: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          logo_url: string | null;
          primary_color: string;
          quote_prefix: string;
          quote_counter: number;
          default_expiry_days: number;
          default_tax_rate: number;
          default_terms: string | null;
          stripe_account_id: string | null;
          deposit_required: boolean;
          deposit_type: string;
          deposit_amount: number;
          review_count: number;
          review_average: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          industry?: Database["public"]["Enums"]["industry_type"];
          phone?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          quote_prefix?: string;
          quote_counter?: number;
          default_expiry_days?: number;
          default_tax_rate?: number;
          default_terms?: string | null;
          stripe_account_id?: string | null;
          deposit_required?: boolean;
          deposit_type?: string;
          deposit_amount?: number;
          review_count?: number;
          review_average?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          industry?: Database["public"]["Enums"]["industry_type"];
          phone?: string | null;
          email?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          logo_url?: string | null;
          primary_color?: string;
          quote_prefix?: string;
          quote_counter?: number;
          default_expiry_days?: number;
          default_tax_rate?: number;
          default_terms?: string | null;
          stripe_account_id?: string | null;
          deposit_required?: boolean;
          deposit_type?: string;
          deposit_amount?: number;
          review_count?: number;
          review_average?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          business_id: string | null;
          role: Database["public"]["Enums"]["user_role"];
          first_name: string;
          last_name: string;
          phone: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          business_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          first_name?: string;
          last_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          business_id: string;
          first_name: string | null;
          last_name: string | null;
          email: string | null;
          phone: string | null;
          company_name: string | null;
          address_line1: string | null;
          address_line2: string | null;
          city: string | null;
          state: string | null;
          zip_code: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          first_name?: string | null;
          last_name?: string | null;
          email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          state?: string | null;
          zip_code?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customers_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      quotes: {
        Row: {
          id: string;
          business_id: string;
          customer_id: string | null;
          created_by: string;
          quote_number: string;
          title: string;
          description: string | null;
          status: Database["public"]["Enums"]["quote_status"];
          subtotal_cents: number;
          tax_rate: number;
          tax_cents: number;
          discount_cents: number;
          total_cents: number;
          notes: string | null;
          customer_notes: string | null;
          expires_at: string | null;
          sent_at: string | null;
          viewed_at: string | null;
          accepted_at: string | null;
          declined_at: string | null;
          voice_transcript: string | null;
          voice_audio_url: string | null;
          voice_confidence: number | null;
          parent_quote_id: string | null;
          revision_number: number;
          revision_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          customer_id?: string | null;
          created_by: string;
          quote_number?: string;
          title: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          subtotal_cents?: number;
          tax_rate?: number;
          tax_cents?: number;
          discount_cents?: number;
          total_cents?: number;
          notes?: string | null;
          customer_notes?: string | null;
          expires_at?: string | null;
          sent_at?: string | null;
          viewed_at?: string | null;
          accepted_at?: string | null;
          declined_at?: string | null;
          voice_transcript?: string | null;
          voice_audio_url?: string | null;
          voice_confidence?: number | null;
          parent_quote_id?: string | null;
          revision_number?: number;
          revision_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          customer_id?: string | null;
          created_by?: string;
          quote_number?: string;
          title?: string;
          description?: string | null;
          status?: Database["public"]["Enums"]["quote_status"];
          subtotal_cents?: number;
          tax_rate?: number;
          tax_cents?: number;
          discount_cents?: number;
          total_cents?: number;
          notes?: string | null;
          customer_notes?: string | null;
          expires_at?: string | null;
          sent_at?: string | null;
          viewed_at?: string | null;
          accepted_at?: string | null;
          declined_at?: string | null;
          voice_transcript?: string | null;
          voice_audio_url?: string | null;
          voice_confidence?: number | null;
          parent_quote_id?: string | null;
          revision_number?: number;
          revision_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quotes_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quotes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_line_items: {
        Row: {
          id: string;
          quote_id: string;
          title: string;
          description: string | null;
          quantity: number;
          unit: string;
          unit_price_cents: number;
          line_total_cents: number;
          item_type: Database["public"]["Enums"]["line_item_type"];
          sort_order: number;
          ai_confidence: number | null;
          ai_reasoning: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          title: string;
          description?: string | null;
          quantity?: number;
          unit?: string;
          unit_price_cents?: number;
          line_total_cents?: number;
          item_type?: Database["public"]["Enums"]["line_item_type"];
          sort_order?: number;
          ai_confidence?: number | null;
          ai_reasoning?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          title?: string;
          description?: string | null;
          quantity?: number;
          unit?: string;
          unit_price_cents?: number;
          line_total_cents?: number;
          item_type?: Database["public"]["Enums"]["line_item_type"];
          sort_order?: number;
          ai_confidence?: number | null;
          ai_reasoning?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_line_items_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_photos: {
        Row: {
          id: string;
          quote_id: string;
          storage_path: string;
          original_filename: string | null;
          mime_type: string | null;
          size_bytes: number | null;
          sort_order: number;
          ai_analysis: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          storage_path: string;
          original_filename?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          sort_order?: number;
          ai_analysis?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          storage_path?: string;
          original_filename?: string | null;
          mime_type?: string | null;
          size_bytes?: number | null;
          sort_order?: number;
          ai_analysis?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_photos_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_activities: {
        Row: {
          id: string;
          quote_id: string;
          actor_id: string | null;
          action: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          actor_id?: string | null;
          action: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          actor_id?: string | null;
          action?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_activities_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quote_activities_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      pricing_catalog: {
        Row: {
          id: string;
          business_id: string;
          title: string;
          description: string | null;
          category: string | null;
          unit: string;
          unit_price_cents: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          title: string;
          description?: string | null;
          category?: string | null;
          unit?: string;
          unit_price_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          title?: string;
          description?: string | null;
          category?: string | null;
          unit?: string;
          unit_price_cents?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pricing_catalog_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      default_pricing_data: {
        Row: {
          id: string;
          industry: string;
          service_type: string;
          service_tier: string;
          region: string | null;
          zip_code_prefix: string | null;
          price_min_cents: number;
          price_avg_cents: number;
          price_max_cents: number;
          labor_rate_min_cents: number;
          labor_rate_avg_cents: number;
          labor_rate_max_cents: number;
          data_source: string | null;
          confidence_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          industry: string;
          service_type: string;
          service_tier?: string;
          region?: string | null;
          zip_code_prefix?: string | null;
          price_min_cents?: number;
          price_avg_cents?: number;
          price_max_cents?: number;
          labor_rate_min_cents?: number;
          labor_rate_avg_cents?: number;
          labor_rate_max_cents?: number;
          data_source?: string | null;
          confidence_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          industry?: string;
          service_type?: string;
          service_tier?: string;
          region?: string | null;
          zip_code_prefix?: string | null;
          price_min_cents?: number;
          price_avg_cents?: number;
          price_max_cents?: number;
          labor_rate_min_cents?: number;
          labor_rate_avg_cents?: number;
          labor_rate_max_cents?: number;
          data_source?: string | null;
          confidence_score?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string;
          business_id: string;
          action_type: string;
          resource_type: string;
          resource_id: string;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          business_id: string;
          action_type: string;
          resource_type: string;
          resource_id: string;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          business_id?: string;
          action_type?: string;
          resource_type?: string;
          resource_id?: string;
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "activity_logs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      team_invitations: {
        Row: {
          id: string;
          business_id: string;
          email: string;
          role: Database["public"]["Enums"]["user_role"];
          invited_by: string;
          invitation_token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          email: string;
          role?: Database["public"]["Enums"]["user_role"];
          invited_by: string;
          invitation_token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          email?: string;
          role?: Database["public"]["Enums"]["user_role"];
          invited_by?: string;
          invitation_token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_invitations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "team_invitations_invited_by_fkey";
            columns: ["invited_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      approval_workflows: {
        Row: {
          id: string;
          business_id: string;
          created_at: string;
          updated_at: string;
          workflow_type: string;
          approval_threshold_cents: number | null;
          requires_admin_approval: boolean;
          requires_owner_approval: boolean;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          business_id: string;
          created_at?: string;
          updated_at?: string;
          workflow_type?: string;
          approval_threshold_cents?: number | null;
          requires_admin_approval?: boolean;
          requires_owner_approval?: boolean;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          business_id?: string;
          created_at?: string;
          updated_at?: string;
          workflow_type?: string;
          approval_threshold_cents?: number | null;
          requires_admin_approval?: boolean;
          requires_owner_approval?: boolean;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "approval_workflows_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      quote_messages: {
        Row: {
          id: string;
          quote_id: string;
          sender_type: "business" | "customer";
          sender_id: string | null;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          quote_id: string;
          sender_type: "business" | "customer";
          sender_id?: string | null;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          quote_id?: string;
          sender_type?: "business" | "customer";
          sender_id?: string | null;
          message?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "quote_messages_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          business_id: string;
          quote_id: string;
          customer_id: string;
          status: "pending_schedule" | "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
          preferred_date: string | null;
          preferred_time_start: string | null;
          preferred_time_end: string | null;
          scheduled_date: string | null;
          scheduled_time: string | null;
          assigned_to: string | null;
          completed_at: string | null;
          customer_notes: string | null;
          internal_notes: string | null;
          review_request_sent: string | null;
          deposit_amount_cents: number | null;
          deposit_paid: boolean;
          deposit_paid_at: string | null;
          stripe_payment_intent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          quote_id: string;
          customer_id: string;
          status?: "pending_schedule" | "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
          preferred_date?: string | null;
          preferred_time_start?: string | null;
          preferred_time_end?: string | null;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          customer_notes?: string | null;
          internal_notes?: string | null;
          review_request_sent?: string | null;
          deposit_amount_cents?: number | null;
          deposit_paid?: boolean;
          deposit_paid_at?: string | null;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          quote_id?: string;
          customer_id?: string;
          status?: "pending_schedule" | "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled";
          preferred_date?: string | null;
          preferred_time_start?: string | null;
          preferred_time_end?: string | null;
          scheduled_date?: string | null;
          scheduled_time?: string | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          customer_notes?: string | null;
          internal_notes?: string | null;
          review_request_sent?: string | null;
          deposit_amount_cents?: number | null;
          deposit_paid?: boolean;
          deposit_paid_at?: string | null;
          stripe_payment_intent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_quote_id_fkey";
            columns: ["quote_id"];
            isOneToOne: false;
            referencedRelation: "quotes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "jobs_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      job_updates: {
        Row: {
          id: string;
          job_id: string;
          update_type: "status_change" | "message" | "eta_update";
          old_status: string | null;
          new_status: string | null;
          message: string | null;
          sender_type: "business" | "customer" | "system" | null;
          eta_minutes: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          update_type: "status_change" | "message" | "eta_update";
          old_status?: string | null;
          new_status?: string | null;
          message?: string | null;
          sender_type?: "business" | "customer" | "system" | null;
          eta_minutes?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          update_type?: "status_change" | "message" | "eta_update";
          old_status?: string | null;
          new_status?: string | null;
          message?: string | null;
          sender_type?: "business" | "customer" | "system" | null;
          eta_minutes?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_updates_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          id: string;
          business_id: string;
          job_id: string;
          customer_id: string;
          rating: number;
          review_text: string | null;
          is_published: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          job_id: string;
          customer_id: string;
          rating: number;
          review_text?: string | null;
          is_published?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          job_id?: string;
          customer_id?: string;
          rating?: number;
          review_text?: string | null;
          is_published?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: true;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_audit_logs: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: Json;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          action?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: Json;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      system_metrics: {
        Row: {
          id: string;
          metric_date: string;
          metric_type: string;
          metric_value: number;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          metric_date: string;
          metric_type: string;
          metric_value: number;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          metric_date?: string;
          metric_type?: string;
          metric_value?: number;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      api_costs: {
        Row: {
          id: string;
          cost_date: string;
          provider: string;
          operation: string;
          request_count: number;
          token_count: number;
          cost_cents: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          cost_date: string;
          provider: string;
          operation: string;
          request_count?: number;
          token_count?: number;
          cost_cents?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          cost_date?: string;
          provider?: string;
          operation?: string;
          request_count?: number;
          token_count?: number;
          cost_cents?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      error_logs: {
        Row: {
          id: string;
          error_hash: string;
          error_type: string;
          error_message: string;
          route: string | null;
          method: string | null;
          status_code: number | null;
          stack_trace: string | null;
          first_seen_at: string;
          last_seen_at: string;
          occurrence_count: number;
          is_resolved: boolean;
          resolved_at: string | null;
          resolved_by: string | null;
          resolution_notes: string | null;
          severity: string;
        };
        Insert: {
          id?: string;
          error_hash: string;
          error_type: string;
          error_message: string;
          route?: string | null;
          method?: string | null;
          status_code?: number | null;
          stack_trace?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          occurrence_count?: number;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          severity?: string;
        };
        Update: {
          id?: string;
          error_hash?: string;
          error_type?: string;
          error_message?: string;
          route?: string | null;
          method?: string | null;
          status_code?: number | null;
          stack_trace?: string | null;
          first_seen_at?: string;
          last_seen_at?: string;
          occurrence_count?: number;
          is_resolved?: boolean;
          resolved_at?: string | null;
          resolved_by?: string | null;
          resolution_notes?: string | null;
          severity?: string;
        };
        Relationships: [
          {
            foreignKeyName: "error_logs_resolved_by_fkey";
            columns: ["resolved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      feature_flags: {
        Row: {
          id: string;
          flag_key: string;
          flag_name: string;
          description: string | null;
          is_enabled: boolean;
          rollout_percentage: number;
          target_industries: string[] | null;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          flag_key: string;
          flag_name: string;
          description?: string | null;
          is_enabled?: boolean;
          rollout_percentage?: number;
          target_industries?: string[] | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          flag_key?: string;
          flag_name?: string;
          description?: string | null;
          is_enabled?: boolean;
          rollout_percentage?: number;
          target_industries?: string[] | null;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feature_flags_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feature_flags_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      incidents: {
        Row: {
          id: string;
          incident_number: number;
          title: string;
          status: string;
          severity: string;
          affected_components: string[];
          started_at: string;
          identified_at: string | null;
          resolved_at: string | null;
          is_public: boolean;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          incident_number?: number;
          title: string;
          status?: string;
          severity?: string;
          affected_components?: string[];
          started_at?: string;
          identified_at?: string | null;
          resolved_at?: string | null;
          is_public?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          incident_number?: number;
          title?: string;
          status?: string;
          severity?: string;
          affected_components?: string[];
          started_at?: string;
          identified_at?: string | null;
          resolved_at?: string | null;
          is_public?: boolean;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incidents_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incidents_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      incident_updates: {
        Row: {
          id: string;
          incident_id: string;
          status: string;
          message: string;
          is_public: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          incident_id: string;
          status: string;
          message: string;
          is_public?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          incident_id?: string;
          status?: string;
          message?: string;
          is_public?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "incident_updates_incident_id_fkey";
            columns: ["incident_id"];
            isOneToOne: false;
            referencedRelation: "incidents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "incident_updates_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scheduled_maintenance: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          scheduled_start: string;
          scheduled_end: string;
          affected_components: string[];
          is_full_outage: boolean;
          show_banner: boolean;
          banner_message: string | null;
          status: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          scheduled_start: string;
          scheduled_end: string;
          affected_components?: string[];
          is_full_outage?: boolean;
          show_banner?: boolean;
          banner_message?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          scheduled_start?: string;
          scheduled_end?: string;
          affected_components?: string[];
          is_full_outage?: boolean;
          show_banner?: boolean;
          banner_message?: string | null;
          status?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scheduled_maintenance_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          key: string;
          value: Json;
          description: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json;
          description?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      support_tickets: {
        Row: {
          id: string;
          ticket_number: number;
          requester_hash: string;
          requester_type: string;
          category: string;
          subject: string;
          status: string;
          priority: string;
          assigned_to: string | null;
          resolved_at: string | null;
          resolution_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_number?: number;
          requester_hash: string;
          requester_type?: string;
          category: string;
          subject: string;
          status?: string;
          priority?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_number?: number;
          requester_hash?: string;
          requester_type?: string;
          category?: string;
          subject?: string;
          status?: string;
          priority?: string;
          assigned_to?: string | null;
          resolved_at?: string | null;
          resolution_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey";
            columns: ["assigned_to"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      support_messages: {
        Row: {
          id: string;
          ticket_id: string;
          sender_type: string;
          sender_id: string | null;
          message_content: string;
          attachment_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          sender_type: string;
          sender_id?: string | null;
          message_content: string;
          attachment_count?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          sender_type?: string;
          sender_id?: string | null;
          message_content?: string;
          attachment_count?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey";
            columns: ["ticket_id"];
            isOneToOne: false;
            referencedRelation: "support_tickets";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limit_violations: {
        Row: {
          id: string;
          identifier_hash: string;
          identifier_type: string;
          limit_type: string;
          limit_value: number;
          request_count: number;
          is_suspicious: boolean;
          suspicion_reason: string | null;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          identifier_hash: string;
          identifier_type: string;
          limit_type: string;
          limit_value: number;
          request_count: number;
          is_suspicious?: boolean;
          suspicion_reason?: string | null;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          identifier_hash?: string;
          identifier_type?: string;
          limit_type?: string;
          limit_value?: number;
          request_count?: number;
          is_suspicious?: boolean;
          suspicion_reason?: string | null;
          occurred_at?: string;
        };
        Relationships: [];
      };
      health_checks: {
        Row: {
          id: string;
          service_name: string;
          check_type: string;
          is_healthy: boolean;
          response_time_ms: number | null;
          error_message: string | null;
          checked_at: string;
        };
        Insert: {
          id?: string;
          service_name: string;
          check_type: string;
          is_healthy: boolean;
          response_time_ms?: number | null;
          error_message?: string | null;
          checked_at?: string;
        };
        Update: {
          id?: string;
          service_name?: string;
          check_type?: string;
          is_healthy?: boolean;
          response_time_ms?: number | null;
          error_message?: string | null;
          checked_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_my_business_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      check_rate_limit: {
        Args: {
          p_key: string;
          p_max_tokens: number;
          p_window_seconds: number;
        };
        Returns: Json;
      };
      is_current_user_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      increment_api_cost: {
        Args: {
          p_cost_date: string;
          p_provider: string;
          p_operation: string;
          p_request_count: number;
          p_token_count: number;
          p_cost_cents: number;
        };
        Returns: undefined;
      };
      get_user_growth_by_month: {
        Args: Record<string, never>;
        Returns: { month: string; new_users: number; total_users: number }[];
      };
      get_avg_quote_production_time: {
        Args: Record<string, never>;
        Returns: { avg_seconds: number }[];
      };
      get_daily_active_businesses: {
        Args: Record<string, never>;
        Returns: { date: string; active_count: number; avg_daily: number }[];
      };
      get_ai_usage_stats: {
        Args: Record<string, never>;
        Returns: {
          ai_count: number;
          manual_count: number;
          ai_percentage: number;
        }[];
      };
      cleanup_old_health_checks: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: {
      user_role: "owner" | "admin" | "technician" | "viewer";
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
        | "revision_requested"
        | "accepted"
        | "declined"
        | "expired";
      line_item_type: "service" | "material" | "labor" | "other";
      industry_type: "hvac" | "plumbing" | "electrical" | "roofing" | "landscaping" | "general";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience aliases
type Tables = Database["public"]["Tables"];
export type Business = Tables["businesses"]["Row"];
export type BusinessInsert = Tables["businesses"]["Insert"];
export type Profile = Tables["profiles"]["Row"];
export type Customer = Tables["customers"]["Row"];
export type CustomerInsert = Tables["customers"]["Insert"];
export type Quote = Tables["quotes"]["Row"];
export type QuoteInsert = Tables["quotes"]["Insert"];
export type QuoteUpdate = Tables["quotes"]["Update"];
export type QuoteLineItem = Tables["quote_line_items"]["Row"];
export type QuoteLineItemInsert = Tables["quote_line_items"]["Insert"];
export type QuotePhoto = Tables["quote_photos"]["Row"];
export type QuoteActivity = Tables["quote_activities"]["Row"];
export type PricingCatalogItem = Tables["pricing_catalog"]["Row"];
export type DefaultPricingData = Tables["default_pricing_data"]["Row"];
export type ActivityLog = Tables["activity_logs"]["Row"];
export type TeamInvitation = Tables["team_invitations"]["Row"];
export type ApprovalWorkflow = Tables["approval_workflows"]["Row"];
export type QuoteMessage = Tables["quote_messages"]["Row"];
export type QuoteMessageInsert = Tables["quote_messages"]["Insert"];
export type Job = Tables["jobs"]["Row"];
export type JobInsert = Tables["jobs"]["Insert"];
export type JobUpdate = Tables["jobs"]["Update"];
export type JobUpdateEntry = Tables["job_updates"]["Row"];
export type JobUpdateEntryInsert = Tables["job_updates"]["Insert"];
export type Review = Tables["reviews"]["Row"];
export type ReviewInsert = Tables["reviews"]["Insert"];
export type QuoteStatus = Database["public"]["Enums"]["quote_status"];
export type LineItemType = Database["public"]["Enums"]["line_item_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type IndustryType = Database["public"]["Enums"]["industry_type"];

export type AdminAuditLog = Tables["admin_audit_logs"]["Row"];
export type AdminAuditLogInsert = Tables["admin_audit_logs"]["Insert"];
export type SystemMetric = Tables["system_metrics"]["Row"];
export type SystemMetricInsert = Tables["system_metrics"]["Insert"];
export type ApiCost = Tables["api_costs"]["Row"];
export type ApiCostInsert = Tables["api_costs"]["Insert"];
export type ErrorLog = Tables["error_logs"]["Row"];
export type ErrorLogInsert = Tables["error_logs"]["Insert"];
export type FeatureFlag = Tables["feature_flags"]["Row"];
export type FeatureFlagInsert = Tables["feature_flags"]["Insert"];
export type Incident = Tables["incidents"]["Row"];
export type IncidentInsert = Tables["incidents"]["Insert"];
export type IncidentUpdate = Tables["incident_updates"]["Row"];
export type IncidentUpdateInsert = Tables["incident_updates"]["Insert"];
export type ScheduledMaintenance = Tables["scheduled_maintenance"]["Row"];
export type ScheduledMaintenanceInsert = Tables["scheduled_maintenance"]["Insert"];
export type SiteSetting = Tables["site_settings"]["Row"];
export type SupportTicket = Tables["support_tickets"]["Row"];
export type SupportTicketInsert = Tables["support_tickets"]["Insert"];
export type SupportMessage = Tables["support_messages"]["Row"];
export type SupportMessageInsert = Tables["support_messages"]["Insert"];
export type RateLimitViolation = Tables["rate_limit_violations"]["Row"];
export type HealthCheck = Tables["health_checks"]["Row"];
export type HealthCheckInsert = Tables["health_checks"]["Insert"];

// Composite types used by the public quote page
export type QuoteWithDetails = Quote & {
  line_items: QuoteLineItem[];
  customer: Customer | null;
  business: Pick<Business, "name" | "logo_url" | "primary_color">;
};
