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
      agenda_items: {
        Row: {
          conference_id: string | null
          created_at: string
          day: string
          id: string
          note: string
          position: number
          session_id: string | null
          updated_at: string
        }
        Insert: {
          conference_id?: string | null
          created_at?: string
          day?: string
          id?: string
          note?: string
          position?: number
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          conference_id?: string | null
          created_at?: string
          day?: string
          id?: string
          note?: string
          position?: number
          session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_items_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author: string
          conference_id: string | null
          created_at: string
          id: string
          initials: string
          mentions: string[]
          target: string
          text: string
          time: string
        }
        Insert: {
          author?: string
          conference_id?: string | null
          created_at?: string
          id?: string
          initials?: string
          mentions?: string[]
          target?: string
          text: string
          time?: string
        }
        Update: {
          author?: string
          conference_id?: string | null
          created_at?: string
          id?: string
          initials?: string
          mentions?: string[]
          target?: string
          text?: string
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      conferences: {
        Row: {
          acronym: string
          created_at: string
          delegate_count: number
          end_date: string
          id: string
          location: string
          name: string
          phase: string
          session_count: number
          start_date: string
          status: string
          therapy_areas: string[]
          updated_at: string
        }
        Insert: {
          acronym: string
          created_at?: string
          delegate_count?: number
          end_date: string
          id: string
          location: string
          name: string
          phase?: string
          session_count?: number
          start_date: string
          status?: string
          therapy_areas?: string[]
          updated_at?: string
        }
        Update: {
          acronym?: string
          created_at?: string
          delegate_count?: number
          end_date?: string
          id?: string
          location?: string
          name?: string
          phase?: string
          session_count?: number
          start_date?: string
          status?: string
          therapy_areas?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      delegates: {
        Row: {
          created_at: string
          focus: string
          id: string
          initials: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          focus?: string
          id?: string
          initials: string
          name: string
          role: string
        }
        Update: {
          created_at?: string
          focus?: string
          id?: string
          initials?: string
          name?: string
          role?: string
        }
        Relationships: []
      }
      endpoints: {
        Row: {
          asset: string
          ci: string
          conference_id: string | null
          created_at: string
          endpoint: string
          endpoint_type: string
          hr: string
          id: string
          p_value: string
          trial_id: string
          trial_name: string
          updated_at: string
          value: string
        }
        Insert: {
          asset?: string
          ci?: string
          conference_id?: string | null
          created_at?: string
          endpoint?: string
          endpoint_type?: string
          hr?: string
          id?: string
          p_value?: string
          trial_id?: string
          trial_name?: string
          updated_at?: string
          value?: string
        }
        Update: {
          asset?: string
          ci?: string
          conference_id?: string | null
          created_at?: string
          endpoint?: string
          endpoint_type?: string
          hr?: string
          id?: string
          p_value?: string
          trial_id?: string
          trial_name?: string
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoints_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_cache: {
        Row: {
          conference_id: string
          created_at: string
          id: string
          query: string | null
          scraped_at: string
          session_count: number
          sessions: Json
          source_url: string
          updated_at: string
        }
        Insert: {
          conference_id: string
          created_at?: string
          id?: string
          query?: string | null
          scraped_at?: string
          session_count?: number
          sessions?: Json
          source_url: string
          updated_at?: string
        }
        Update: {
          conference_id?: string
          created_at?: string
          id?: string
          query?: string | null
          scraped_at?: string
          session_count?: number
          sessions?: Json
          source_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_cache_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_runs: {
        Row: {
          attempts: Json
          conference_id: string
          created_at: string
          endpoints_created: number
          from_cache: boolean
          id: string
          new_sessions: number
          posters_created: number
          query: string | null
          reason: string | null
          session_count: number
          source_url: string | null
          status: string
        }
        Insert: {
          attempts?: Json
          conference_id: string
          created_at?: string
          endpoints_created?: number
          from_cache?: boolean
          id?: string
          new_sessions?: number
          posters_created?: number
          query?: string | null
          reason?: string | null
          session_count?: number
          source_url?: string | null
          status?: string
        }
        Update: {
          attempts?: Json
          conference_id?: string
          created_at?: string
          endpoints_created?: number
          from_cache?: boolean
          id?: string
          new_sessions?: number
          posters_created?: number
          query?: string | null
          reason?: string | null
          session_count?: number
          source_url?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_runs_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      hypotheses: {
        Row: {
          conference_id: string | null
          created_at: string
          evidence: Json
          gap: boolean
          id: string
          impact: string
          kiq_id: string | null
          likelihood: string
          statement: string
          updated_at: string
        }
        Insert: {
          conference_id?: string | null
          created_at?: string
          evidence?: Json
          gap?: boolean
          id?: string
          impact?: string
          kiq_id?: string | null
          likelihood?: string
          statement: string
          updated_at?: string
        }
        Update: {
          conference_id?: string | null
          created_at?: string
          evidence?: Json
          gap?: boolean
          id?: string
          impact?: string
          kiq_id?: string | null
          likelihood?: string
          statement?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hypotheses_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hypotheses_kiq_id_fkey"
            columns: ["kiq_id"]
            isOneToOne: false
            referencedRelation: "kiqs"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          conference_id: string | null
          confidence: number
          contradictory: boolean
          created_at: string
          duplicate_of: string | null
          id: string
          impact: number
          kiq_id: string | null
          kit_id: string | null
          novelty: number
          page: number
          poster_id: string | null
          significant: boolean
          source_quote: string
          text: string
          updated_at: string
        }
        Insert: {
          conference_id?: string | null
          confidence?: number
          contradictory?: boolean
          created_at?: string
          duplicate_of?: string | null
          id?: string
          impact?: number
          kiq_id?: string | null
          kit_id?: string | null
          novelty?: number
          page?: number
          poster_id?: string | null
          significant?: boolean
          source_quote?: string
          text: string
          updated_at?: string
        }
        Update: {
          conference_id?: string | null
          confidence?: number
          contradictory?: boolean
          created_at?: string
          duplicate_of?: string | null
          id?: string
          impact?: number
          kiq_id?: string | null
          kit_id?: string | null
          novelty?: number
          page?: number
          poster_id?: string | null
          significant?: boolean
          source_quote?: string
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insights_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_kiq_id_fkey"
            columns: ["kiq_id"]
            isOneToOne: false
            referencedRelation: "kiqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_poster_id_fkey"
            columns: ["poster_id"]
            isOneToOne: false
            referencedRelation: "posters"
            referencedColumns: ["id"]
          },
        ]
      }
      kiqs: {
        Row: {
          completion: number
          created_at: string
          has_new_evidence: boolean
          id: string
          kit_id: string | null
          mapped_sessions: number
          question: string
          updated_at: string
        }
        Insert: {
          completion?: number
          created_at?: string
          has_new_evidence?: boolean
          id?: string
          kit_id?: string | null
          mapped_sessions?: number
          question: string
          updated_at?: string
        }
        Update: {
          completion?: number
          created_at?: string
          has_new_evidence?: boolean
          id?: string
          kit_id?: string | null
          mapped_sessions?: number
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiqs_kit_id_fkey"
            columns: ["kit_id"]
            isOneToOne: false
            referencedRelation: "kits"
            referencedColumns: ["id"]
          },
        ]
      }
      kits: {
        Row: {
          conference_id: string | null
          created_at: string
          id: string
          owner: string
          topic: string
          updated_at: string
        }
        Insert: {
          conference_id?: string | null
          created_at?: string
          id?: string
          owner?: string
          topic: string
          updated_at?: string
        }
        Update: {
          conference_id?: string | null
          created_at?: string
          id?: string
          owner?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kits_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      lba_alerts: {
        Row: {
          abstract_number: string
          conference_id: string | null
          created_at: string
          detected_at: string
          first_seen_at: string
          id: string
          indication: string
          kit_topic: string | null
          last_seen_at: string
          match_reason: string
          phase: string
          relevance_score: number
          relevant_to_kit: boolean
          source_url: string | null
          sponsor: string
          status: string
          summary: string
          title: string
          trial_id: string
          updated_at: string
          watch_term: string
        }
        Insert: {
          abstract_number?: string
          conference_id?: string | null
          created_at?: string
          detected_at?: string
          first_seen_at?: string
          id?: string
          indication?: string
          kit_topic?: string | null
          last_seen_at?: string
          match_reason?: string
          phase?: string
          relevance_score?: number
          relevant_to_kit?: boolean
          source_url?: string | null
          sponsor?: string
          status?: string
          summary?: string
          title: string
          trial_id?: string
          updated_at?: string
          watch_term?: string
        }
        Update: {
          abstract_number?: string
          conference_id?: string | null
          created_at?: string
          detected_at?: string
          first_seen_at?: string
          id?: string
          indication?: string
          kit_topic?: string | null
          last_seen_at?: string
          match_reason?: string
          phase?: string
          relevance_score?: number
          relevant_to_kit?: boolean
          source_url?: string | null
          sponsor?: string
          status?: string
          summary?: string
          title?: string
          trial_id?: string
          updated_at?: string
          watch_term?: string
        }
        Relationships: [
          {
            foreignKeyName: "lba_alerts_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      lba_scan_runs: {
        Row: {
          alerts_found: number
          conference_id: string | null
          created_at: string
          duration_ms: number
          error: string | null
          id: string
          new_alerts: number
          sources_scanned: string[]
          status: string
          updated_at: string
        }
        Insert: {
          alerts_found?: number
          conference_id?: string | null
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          new_alerts?: number
          sources_scanned?: string[]
          status?: string
          updated_at?: string
        }
        Update: {
          alerts_found?: number
          conference_id?: string | null
          created_at?: string
          duration_ms?: number
          error?: string | null
          id?: string
          new_alerts?: number
          sources_scanned?: string[]
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lba_scan_runs_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      lba_watchlist: {
        Row: {
          active: boolean
          conference_id: string | null
          created_at: string
          id: string
          kind: string
          priority: number
          term: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          conference_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          priority?: number
          term: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          conference_id?: string | null
          created_at?: string
          id?: string
          kind?: string
          priority?: number
          term?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lba_watchlist_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      posters: {
        Row: {
          captured_at: string
          captured_by: string
          conference_id: string | null
          confidence: number
          contradictory: boolean
          created_at: string
          id: string
          ocr_status: string
          page: number
          presenter: string
          significant: boolean
          source_quote: string
          summary: string[]
          therapy_area: string
          title: string
          updated_at: string
        }
        Insert: {
          captured_at?: string
          captured_by?: string
          conference_id?: string | null
          confidence?: number
          contradictory?: boolean
          created_at?: string
          id?: string
          ocr_status?: string
          page?: number
          presenter?: string
          significant?: boolean
          source_quote?: string
          summary?: string[]
          therapy_area?: string
          title: string
          updated_at?: string
        }
        Update: {
          captured_at?: string
          captured_by?: string
          conference_id?: string | null
          confidence?: number
          contradictory?: boolean
          created_at?: string
          id?: string
          ocr_status?: string
          page?: number
          presenter?: string
          significant?: boolean
          source_quote?: string
          summary?: string[]
          therapy_area?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posters_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          affiliation: string
          asset: string
          assigned_to: string | null
          authors: string
          conference_id: string | null
          confidence: number
          conflict: boolean
          created_at: string
          day: string
          id: string
          kiq_id: string | null
          phase: string
          room: string
          source_url: string | null
          therapy_area: string
          time: string
          title: string
          trial_id: string | null
          updated_at: string
        }
        Insert: {
          affiliation?: string
          asset?: string
          assigned_to?: string | null
          authors?: string
          conference_id?: string | null
          confidence?: number
          conflict?: boolean
          created_at?: string
          day?: string
          id?: string
          kiq_id?: string | null
          phase?: string
          room?: string
          source_url?: string | null
          therapy_area?: string
          time?: string
          title: string
          trial_id?: string | null
          updated_at?: string
        }
        Update: {
          affiliation?: string
          asset?: string
          assigned_to?: string | null
          authors?: string
          conference_id?: string | null
          confidence?: number
          conflict?: boolean
          created_at?: string
          day?: string
          id?: string
          kiq_id?: string | null
          phase?: string
          room?: string
          source_url?: string | null
          therapy_area?: string
          time?: string
          title?: string
          trial_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "delegates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_conference_id_fkey"
            columns: ["conference_id"]
            isOneToOne: false
            referencedRelation: "conferences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_kiq_id_fkey"
            columns: ["kiq_id"]
            isOneToOne: false
            referencedRelation: "kiqs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
