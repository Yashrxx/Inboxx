export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      alert_logs: {
        Row: {
          ai_summary: string | null;
          email_subject: string;
          extracted_preview: string | null;
          gmail_message_id: string | null;
          id: string;
          matched_keyword: string;
          matched_source: string;
          notification_status: string;
          rule_id: string | null;
          sender_email: string;
          source_filename: string | null;
          triggered_at: string;
          workspace_id: string;
        };
        Insert: {
          ai_summary?: string | null;
          email_subject: string;
          extracted_preview?: string | null;
          gmail_message_id?: string | null;
          id?: string;
          matched_keyword: string;
          matched_source: string;
          notification_status?: string;
          rule_id?: string | null;
          sender_email: string;
          source_filename?: string | null;
          triggered_at?: string;
          workspace_id: string;
        };
        Update: {
          ai_summary?: string | null;
          email_subject?: string;
          extracted_preview?: string | null;
          gmail_message_id?: string | null;
          id?: string;
          matched_keyword?: string;
          matched_source?: string;
          notification_status?: string;
          rule_id?: string | null;
          sender_email?: string;
          source_filename?: string | null;
          triggered_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_logs_rule_id_fkey";
            columns: ["rule_id"];
            isOneToOne: false;
            referencedRelation: "alert_rules";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alert_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      alert_rules: {
        Row: {
          ai_summarize: boolean;
          created_at: string;
          id: string;
          is_active: boolean;
          keywords: string[];
          notify_on_missing_keyword: boolean;
          notify_telegram: boolean;
          operator: string;
          rule_name: string;
          scan_sources: string[];
          tg_show_detailed_summary: boolean | null;
          tg_show_match_details: boolean | null;
          tg_show_scanned_file: boolean | null;
          tg_show_sender: boolean | null;
          tg_show_subject: boolean | null;
          topic_keywords: string[];
          workspace_id: string;
        };
        Insert: {
          ai_summarize?: boolean;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          keywords: string[];
          notify_on_missing_keyword?: boolean;
          notify_telegram?: boolean;
          operator?: string;
          rule_name: string;
          scan_sources?: string[];
          tg_show_detailed_summary?: boolean | null;
          tg_show_match_details?: boolean | null;
          tg_show_scanned_file?: boolean | null;
          tg_show_sender?: boolean | null;
          tg_show_subject?: boolean | null;
          topic_keywords?: string[];
          workspace_id: string;
        };
        Update: {
          ai_summarize?: boolean;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          keywords?: string[];
          notify_on_missing_keyword?: boolean;
          notify_telegram?: boolean;
          operator?: string;
          rule_name?: string;
          scan_sources?: string[];
          tg_show_detailed_summary?: boolean | null;
          tg_show_match_details?: boolean | null;
          tg_show_scanned_file?: boolean | null;
          tg_show_sender?: boolean | null;
          tg_show_subject?: boolean | null;
          topic_keywords?: string[];
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "alert_rules_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      answer_logs: {
        Row: {
          answer_text: string;
          confidence_flag: boolean;
          correction: string | null;
          created_at: string;
          id: string;
          incoming_text: string;
          rating: number | null;
          session_id: string | null;
          source: string | null;
          source_domain: string | null;
          sources_used: Json;
          status: Database["public"]["Enums"]["log_status"];
          type: Database["public"]["Enums"]["log_type"];
          updated_at: string;
          workspace_id: string | null;
        };
        Insert: {
          answer_text: string;
          confidence_flag?: boolean;
          correction?: string | null;
          created_at?: string;
          id?: string;
          incoming_text: string;
          rating?: number | null;
          session_id?: string | null;
          source?: string | null;
          source_domain?: string | null;
          sources_used?: Json;
          status?: Database["public"]["Enums"]["log_status"];
          type: Database["public"]["Enums"]["log_type"];
          updated_at?: string;
          workspace_id?: string | null;
        };
        Update: {
          answer_text?: string;
          confidence_flag?: boolean;
          correction?: string | null;
          created_at?: string;
          id?: string;
          incoming_text?: string;
          rating?: number | null;
          session_id?: string | null;
          source?: string | null;
          source_domain?: string | null;
          sources_used?: Json;
          status?: Database["public"]["Enums"]["log_status"];
          type?: Database["public"]["Enums"]["log_type"];
          updated_at?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "answer_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      integrations: {
        Row: {
          access_token: string | null;
          connected_at: string;
          email: string | null;
          id: string;
          provider: string;
          refresh_token: string | null;
          user_id: string;
        };
        Insert: {
          access_token?: string | null;
          connected_at?: string;
          email?: string | null;
          id?: string;
          provider: string;
          refresh_token?: string | null;
          user_id: string;
        };
        Update: {
          access_token?: string | null;
          connected_at?: string;
          email?: string | null;
          id?: string;
          provider?: string;
          refresh_token?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "integrations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_chunks: {
        Row: {
          chunk_index: number;
          content: string;
          created_at: string;
          document_id: string;
          embedding: string | null;
          id: string;
        };
        Insert: {
          chunk_index: number;
          content: string;
          created_at?: string;
          document_id: string;
          embedding?: string | null;
          id?: string;
        };
        Update: {
          chunk_index?: number;
          content?: string;
          created_at?: string;
          document_id?: string;
          embedding?: string | null;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "kb_chunks_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "kb_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_documents: {
        Row: {
          byte_size: number | null;
          created_at: string;
          filename: string;
          id: string;
          mime_type: string | null;
          uploaded_by: string | null;
          workspace_id: string | null;
        };
        Insert: {
          byte_size?: number | null;
          created_at?: string;
          filename: string;
          id?: string;
          mime_type?: string | null;
          uploaded_by?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          byte_size?: number | null;
          created_at?: string;
          filename?: string;
          id?: string;
          mime_type?: string | null;
          uploaded_by?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kb_documents_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      kb_images: {
        Row: {
          caption: string | null;
          created_at: string | null;
          id: string;
          image_url: string;
          name: string;
          tags: string | null;
          workspace_id: string | null;
        };
        Insert: {
          caption?: string | null;
          created_at?: string | null;
          id?: string;
          image_url: string;
          name: string;
          tags?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          caption?: string | null;
          created_at?: string | null;
          id?: string;
          image_url?: string;
          name?: string;
          tags?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kb_images_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          category: string;
          channel: string;
          contact: string | null;
          created_at: string;
          id: string;
          last_activity: string;
          name: string | null;
          score: number;
          session_id: string | null;
          source: string | null;
          source_domain: string | null;
          status: string;
          summary: string | null;
          workspace_id: string | null;
        };
        Insert: {
          category?: string;
          channel?: string;
          contact?: string | null;
          created_at?: string;
          id?: string;
          last_activity?: string;
          name?: string | null;
          score?: number;
          session_id?: string | null;
          source?: string | null;
          source_domain?: string | null;
          status?: string;
          summary?: string | null;
          workspace_id?: string | null;
        };
        Update: {
          category?: string;
          channel?: string;
          contact?: string | null;
          created_at?: string;
          id?: string;
          last_activity?: string;
          name?: string | null;
          score?: number;
          session_id?: string | null;
          source?: string | null;
          source_domain?: string | null;
          status?: string;
          summary?: string | null;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          company_name: string | null;
          company_size: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          industry: string | null;
          telegram_chat_id: string | null;
        };
        Insert: {
          company_name?: string | null;
          company_size?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          industry?: string | null;
          telegram_chat_id?: string | null;
        };
        Update: {
          company_name?: string | null;
          company_size?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          industry?: string | null;
          telegram_chat_id?: string | null;
        };
        Relationships: [];
      };
      workspaces: {
        Row: {
          created_at: string;
          gmail_email_address: string | null;
          gmail_history_id: string | null;
          gmail_watch_expiration: number | null;
          id: string;
          industry: string | null;
          name: string | null;
          system_prompt: string | null;
          telegram_bot_token: string | null;
          telegram_chat_id: string | null;
          user_id: string;
          welcome_message: string | null;
        };
        Insert: {
          created_at?: string;
          gmail_email_address?: string | null;
          gmail_history_id?: string | null;
          gmail_watch_expiration?: number | null;
          id?: string;
          industry?: string | null;
          name?: string | null;
          system_prompt?: string | null;
          telegram_bot_token?: string | null;
          telegram_chat_id?: string | null;
          user_id: string;
          welcome_message?: string | null;
        };
        Update: {
          created_at?: string;
          gmail_email_address?: string | null;
          gmail_history_id?: string | null;
          gmail_watch_expiration?: number | null;
          id?: string;
          industry?: string | null;
          name?: string | null;
          system_prompt?: string | null;
          telegram_bot_token?: string | null;
          telegram_chat_id?: string | null;
          user_id?: string;
          welcome_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "workspaces_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      match_kb_chunks: {
        Args: {
          match_count?: number;
          query_embedding: string;
          workspace_id_filter: string;
        };
        Returns: {
          content: string;
          document_id: string;
          filename: string;
          id: string;
          similarity: number;
        }[];
      };
    };
    Enums: {
      log_status: "new" | "good" | "needs_fix" | "sent" | "archived";
      log_type: "chat" | "email_draft";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      log_status: ["new", "good", "needs_fix", "sent", "archived"],
      log_type: ["chat", "email_draft"],
    },
  },
} as const;
