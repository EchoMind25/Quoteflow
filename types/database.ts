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
    };
    Enums: {
      user_role: "owner" | "admin" | "technician" | "viewer";
      quote_status:
        | "draft"
        | "sent"
        | "viewed"
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
export type QuoteStatus = Database["public"]["Enums"]["quote_status"];
export type LineItemType = Database["public"]["Enums"]["line_item_type"];
export type UserRole = Database["public"]["Enums"]["user_role"];
export type IndustryType = Database["public"]["Enums"]["industry_type"];

// Composite types used by the public quote page
export type QuoteWithDetails = Quote & {
  line_items: QuoteLineItem[];
  customer: Customer | null;
  business: Pick<Business, "name" | "logo_url" | "primary_color">;
};
