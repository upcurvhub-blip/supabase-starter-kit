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
      ad_events: {
        Row: {
          ad_id: string
          created_at: string
          device_id: string | null
          event_type: string
          id: string
          metadata: Json | null
          page_path: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          device_id?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          device_id?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          page_path?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          ad_type: string
          click_count: number
          content: Json
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          is_active: boolean
          name: string
          placements: string[]
          priority: number
          start_at: string | null
          target_category_ids: string[] | null
          target_cities: string[] | null
          updated_at: string
          view_count: number
        }
        Insert: {
          ad_type: string
          click_count?: number
          content?: Json
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          placements?: string[]
          priority?: number
          start_at?: string | null
          target_category_ids?: string[] | null
          target_cities?: string[] | null
          updated_at?: string
          view_count?: number
        }
        Update: {
          ad_type?: string
          click_count?: number
          content?: Json
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          placements?: string[]
          priority?: number
          start_at?: string | null
          target_category_ids?: string[] | null
          target_cities?: string[] | null
          updated_at?: string
          view_count?: number
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      business_visitor_leads: {
        Row: {
          business_name: string
          city: string | null
          created_at: string
          device_id: string | null
          id: string
          metadata: Json
          notes: string | null
          page_path: string | null
          phone: string
          session_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_name: string
          city?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          page_path?: string | null
          phone: string
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_name?: string
          city?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          metadata?: Json
          notes?: string | null
          page_path?: string | null
          phone?: string
          session_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      buyer_intent_signals: {
        Row: {
          created_at: string
          id: string
          session_id: string
          signal_data: Json | null
          signal_type: string
          user_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          session_id: string
          signal_data?: Json | null
          signal_type: string
          user_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string
          signal_data?: Json | null
          signal_type?: string
          user_id?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      buying_guides: {
        Row: {
          body_md: string
          category_id: string | null
          created_at: string
          faq_json: Json
          id: string
          is_published: boolean
          meta_description: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body_md?: string
          category_id?: string | null
          created_at?: string
          faq_json?: Json
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body_md?: string
          category_id?: string | null
          created_at?: string
          faq_json?: Json
          id?: string
          is_published?: boolean
          meta_description?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buying_guides_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_service: boolean
          level: number | null
          name: string
          parent_id: string | null
          related_keywords: string[] | null
          service_ai_flagged: boolean | null
          service_ai_reason: string | null
          service_confidence: number | null
          slug: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean
          level?: number | null
          name: string
          parent_id?: string | null
          related_keywords?: string[] | null
          service_ai_flagged?: boolean | null
          service_ai_reason?: string | null
          service_confidence?: number | null
          slug: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_service?: boolean
          level?: number | null
          name?: string
          parent_id?: string | null
          related_keywords?: string[] | null
          service_ai_flagged?: boolean | null
          service_ai_reason?: string | null
          service_confidence?: number | null
          slug?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_spec_templates: {
        Row: {
          category_id: string | null
          created_at: string
          fields: Json
          id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          fields?: Json
          id?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          fields?: Json
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_spec_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: true
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string | null
          buyer_unread: number
          created_at: string
          device_id: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          last_message: string | null
          last_message_at: string
          lead_id: string | null
          product_id: string | null
          seller_id: string
          seller_unread: number
          subject: string | null
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          buyer_unread?: number
          created_at?: string
          device_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string
          lead_id?: string | null
          product_id?: string | null
          seller_id: string
          seller_unread?: number
          subject?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          buyer_unread?: number
          created_at?: string
          device_id?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string
          lead_id?: string | null
          product_id?: string | null
          seller_id?: string
          seller_unread?: number
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          deal_id: string
          description: string | null
          id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          deal_id: string
          description?: string | null
          id?: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deal_tracking"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_stages: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          is_final: boolean
          is_lost: boolean
          is_won: boolean
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_final?: boolean
          is_lost?: boolean
          is_won?: boolean
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          is_final?: boolean
          is_lost?: boolean
          is_won?: boolean
          name?: string
        }
        Relationships: []
      }
      deal_tracking: {
        Row: {
          created_at: string
          current_stage_id: string | null
          deal_value: number
          id: string
          lead_id: string | null
          next_action_date: string | null
          notes: string | null
          probability: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_stage_id?: string | null
          deal_value?: number
          id?: string
          lead_id?: string | null
          next_action_date?: string | null
          notes?: string | null
          probability?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_stage_id?: string | null
          deal_value?: number
          id?: string
          lead_id?: string | null
          next_action_date?: string | null
          notes?: string | null
          probability?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_tracking_current_stage_id_fkey"
            columns: ["current_stage_id"]
            isOneToOne: false
            referencedRelation: "deal_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tracking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_tracking_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          amount: number | null
          buyer_id: string | null
          closed_at: string | null
          created_at: string
          expected_close: string | null
          id: string
          lead_id: string | null
          notes: string | null
          probability: number | null
          product_id: string | null
          seller_id: string
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          buyer_id?: string | null
          closed_at?: string | null
          created_at?: string
          expected_close?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          probability?: number | null
          product_id?: string | null
          seller_id: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          buyer_id?: string | null
          closed_at?: string | null
          created_at?: string
          expected_close?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          probability?: number | null
          product_id?: string | null
          seller_id?: string
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deals_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intent_scores: {
        Row: {
          category_id: string | null
          computed_at: string
          id: string
          score: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          computed_at?: string
          id?: string
          score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          computed_at?: string
          id?: string
          score?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "intent_scores_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_links: {
        Row: {
          anchor: string | null
          created_at: string
          from_entity_id: string
          from_entity_type: string
          id: string
          to_entity_id: string
          to_entity_type: string
          weight: number
        }
        Insert: {
          anchor?: string | null
          created_at?: string
          from_entity_id: string
          from_entity_type: string
          id?: string
          to_entity_id: string
          to_entity_type: string
          weight?: number
        }
        Update: {
          anchor?: string | null
          created_at?: string
          from_entity_id?: string
          from_entity_type?: string
          id?: string
          to_entity_id?: string
          to_entity_type?: string
          weight?: number
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_at: string
          expires_at: string | null
          id: string
          lead_id: string
          priority: number | null
          responded_at: string | null
          seller_id: string
          status: string | null
        }
        Insert: {
          assigned_at?: string
          expires_at?: string | null
          id?: string
          lead_id: string
          priority?: number | null
          responded_at?: string | null
          seller_id: string
          status?: string | null
        }
        Update: {
          assigned_at?: string
          expires_at?: string | null
          id?: string
          lead_id?: string
          priority?: number | null
          responded_at?: string | null
          seller_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_price_history: {
        Row: {
          base_price: number | null
          created_at: string
          final_price: number
          geography_tier: string | null
          id: string
          intent_score: number | null
          lead_id: string | null
          urgency_level: string | null
        }
        Insert: {
          base_price?: number | null
          created_at?: string
          final_price?: number
          geography_tier?: string | null
          id?: string
          intent_score?: number | null
          lead_id?: string | null
          urgency_level?: string | null
        }
        Update: {
          base_price?: number | null
          created_at?: string
          final_price?: number
          geography_tier?: string | null
          id?: string
          intent_score?: number | null
          lead_id?: string | null
          urgency_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_price_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_pricing_config: {
        Row: {
          base_price: number
          category_id: string | null
          created_at: string
          id: string
          intent_multiplier_high: number
          intent_multiplier_low: number
          intent_multiplier_medium: number
          is_active: boolean
          max_price: number
          min_price: number
          updated_at: string
          urgency_multiplier_critical: number
          urgency_multiplier_normal: number
          urgency_multiplier_urgent: number
        }
        Insert: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          id?: string
          intent_multiplier_high?: number
          intent_multiplier_low?: number
          intent_multiplier_medium?: number
          is_active?: boolean
          max_price?: number
          min_price?: number
          updated_at?: string
          urgency_multiplier_critical?: number
          urgency_multiplier_normal?: number
          urgency_multiplier_urgent?: number
        }
        Update: {
          base_price?: number
          category_id?: string | null
          created_at?: string
          id?: string
          intent_multiplier_high?: number
          intent_multiplier_low?: number
          intent_multiplier_medium?: number
          is_active?: boolean
          max_price?: number
          min_price?: number
          updated_at?: string
          urgency_multiplier_critical?: number
          urgency_multiplier_normal?: number
          urgency_multiplier_urgent?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_pricing_config_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          budget: number | null
          buyer_id: string | null
          category_id: string | null
          created_at: string
          device_id: string | null
          expected_conversion: number | null
          follow_up_at: string | null
          follow_up_completed_at: string | null
          follow_up_done: boolean
          follow_up_notes: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          informed: boolean
          informed_at: string | null
          informed_by: string | null
          intent_score: number | null
          lead_price: number | null
          lead_score: number | null
          message: string | null
          metadata: Json | null
          product_id: string | null
          quantity: number | null
          quantity_unit: string | null
          requirement_id: string | null
          responded_at: string | null
          response_deadline: string | null
          seller_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          unit: string | null
          updated_at: string
        }
        Insert: {
          budget?: number | null
          buyer_id?: string | null
          category_id?: string | null
          created_at?: string
          device_id?: string | null
          expected_conversion?: number | null
          follow_up_at?: string | null
          follow_up_completed_at?: string | null
          follow_up_done?: boolean
          follow_up_notes?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          informed?: boolean
          informed_at?: string | null
          informed_by?: string | null
          intent_score?: number | null
          lead_price?: number | null
          lead_score?: number | null
          message?: string | null
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          requirement_id?: string | null
          responded_at?: string | null
          response_deadline?: string | null
          seller_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          unit?: string | null
          updated_at?: string
        }
        Update: {
          budget?: number | null
          buyer_id?: string | null
          category_id?: string | null
          created_at?: string
          device_id?: string | null
          expected_conversion?: number | null
          follow_up_at?: string | null
          follow_up_completed_at?: string | null
          follow_up_done?: boolean
          follow_up_notes?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          informed?: boolean
          informed_at?: string | null
          informed_by?: string | null
          intent_score?: number | null
          lead_price?: number | null
          lead_score?: number | null
          message?: string | null
          metadata?: Json | null
          product_id?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          requirement_id?: string | null
          responded_at?: string | null
          response_deadline?: string | null
          seller_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_landing_page_sellers: {
        Row: {
          created_at: string
          id: string
          is_featured: boolean
          page_id: string
          position: number
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_featured?: boolean
          page_id: string
          position?: number
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_featured?: boolean
          page_id?: string
          position?: number
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_landing_page_sellers_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "local_landing_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "local_landing_page_sellers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      local_landing_pages: {
        Row: {
          category_id: string | null
          city: string
          created_at: string
          created_by: string | null
          faq: Json | null
          footer_html: string | null
          h1: string
          hero_content: string | null
          id: string
          intro_html: string | null
          is_published: boolean
          meta_description: string | null
          page_type: string
          published_at: string | null
          slug: string
          state: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          city: string
          created_at?: string
          created_by?: string | null
          faq?: Json | null
          footer_html?: string | null
          h1: string
          hero_content?: string | null
          id?: string
          intro_html?: string | null
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          published_at?: string | null
          slug: string
          state?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          city?: string
          created_at?: string
          created_by?: string | null
          faq?: Json | null
          footer_html?: string | null
          h1?: string
          hero_content?: string | null
          id?: string
          intro_html?: string | null
          is_published?: boolean
          meta_description?: string | null
          page_type?: string
          published_at?: string | null
          slug?: string
          state?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "local_landing_pages_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      local_page_views: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          device_id: string | null
          id: string
          page_id: string
          path: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          page_id: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          device_id?: string | null
          id?: string
          page_id?: string
          path?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "local_page_views_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "local_landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string | null
          sender_role: string
        }
        Insert: {
          attachment_url?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_role: string
        }
        Update: {
          attachment_url?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string | null
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      product_brands: {
        Row: {
          brand_id: string
          created_at: string
          product_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          product_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_brands_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cta_events: {
        Row: {
          created_at: string
          cta: string
          id: string
          product_id: string
          referrer: string | null
          seller_id: string | null
          session_id: string | null
        }
        Insert: {
          created_at?: string
          cta: string
          id?: string
          product_id: string
          referrer?: string | null
          seller_id?: string | null
          session_id?: string | null
        }
        Update: {
          created_at?: string
          cta?: string
          id?: string
          product_id?: string
          referrer?: string | null
          seller_id?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_cta_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          product_id: string
          question: string
          source: string
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          position?: number
          product_id: string
          question: string
          source?: string
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          product_id?: string
          question?: string
          source?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_faqs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          created_at: string
          duration_seconds: number | null
          id: string
          ip_address: string | null
          product_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
          view_duration: number | null
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          product_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          view_duration?: number | null
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          id?: string
          ip_address?: string | null
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          view_duration?: number | null
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          brochure_url: string | null
          cancellation_policy: string | null
          category_id: string | null
          certifications: string[] | null
          cod_available: boolean
          created_at: string
          currency: string | null
          customization_available: boolean
          customization_details: string | null
          delivery_available: boolean
          delivery_locations: string[] | null
          delivery_scope: string | null
          delivery_time: string | null
          description: string | null
          embedding_updated_at: string | null
          enquiry_count: number | null
          features: string[] | null
          hsn_code: string | null
          id: string
          images: Json | null
          installation_available: boolean
          is_active: boolean | null
          is_featured: boolean | null
          lead_count: number | null
          lead_time: string | null
          min_order_quantity: number | null
          min_order_value: number | null
          min_purchase_qty: number | null
          model: string | null
          moq: number | null
          moq_unit: string | null
          mrp: number | null
          name: string
          payment_methods: string[] | null
          pickup_available: boolean
          price: number | null
          price_max: number | null
          price_min: number | null
          price_unit: string | null
          primary_image_url: string | null
          product_condition: string | null
          rank_score: number | null
          replacement_available: boolean
          return_policy: string | null
          return_window_days: number | null
          search_embedding: unknown
          seller_id: string
          selling_mode: string
          selling_price: number | null
          shipping_info: string | null
          short_description: string | null
          sku: string | null
          slug: string
          spec_sheet_url: string | null
          specifications: Json | null
          stock_availability: string | null
          stock_quantity: number | null
          supply_capacity: string | null
          tags: string[] | null
          unit: string | null
          updated_at: string
          variants: Json
          video_url: string | null
          view_count: number | null
          warranty: string | null
          wholesale_tiers: Json
        }
        Insert: {
          brand?: string | null
          brochure_url?: string | null
          cancellation_policy?: string | null
          category_id?: string | null
          certifications?: string[] | null
          cod_available?: boolean
          created_at?: string
          currency?: string | null
          customization_available?: boolean
          customization_details?: string | null
          delivery_available?: boolean
          delivery_locations?: string[] | null
          delivery_scope?: string | null
          delivery_time?: string | null
          description?: string | null
          embedding_updated_at?: string | null
          enquiry_count?: number | null
          features?: string[] | null
          hsn_code?: string | null
          id?: string
          images?: Json | null
          installation_available?: boolean
          is_active?: boolean | null
          is_featured?: boolean | null
          lead_count?: number | null
          lead_time?: string | null
          min_order_quantity?: number | null
          min_order_value?: number | null
          min_purchase_qty?: number | null
          model?: string | null
          moq?: number | null
          moq_unit?: string | null
          mrp?: number | null
          name: string
          payment_methods?: string[] | null
          pickup_available?: boolean
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          price_unit?: string | null
          primary_image_url?: string | null
          product_condition?: string | null
          rank_score?: number | null
          replacement_available?: boolean
          return_policy?: string | null
          return_window_days?: number | null
          search_embedding?: unknown
          seller_id: string
          selling_mode?: string
          selling_price?: number | null
          shipping_info?: string | null
          short_description?: string | null
          sku?: string | null
          slug: string
          spec_sheet_url?: string | null
          specifications?: Json | null
          stock_availability?: string | null
          stock_quantity?: number | null
          supply_capacity?: string | null
          tags?: string[] | null
          unit?: string | null
          updated_at?: string
          variants?: Json
          video_url?: string | null
          view_count?: number | null
          warranty?: string | null
          wholesale_tiers?: Json
        }
        Update: {
          brand?: string | null
          brochure_url?: string | null
          cancellation_policy?: string | null
          category_id?: string | null
          certifications?: string[] | null
          cod_available?: boolean
          created_at?: string
          currency?: string | null
          customization_available?: boolean
          customization_details?: string | null
          delivery_available?: boolean
          delivery_locations?: string[] | null
          delivery_scope?: string | null
          delivery_time?: string | null
          description?: string | null
          embedding_updated_at?: string | null
          enquiry_count?: number | null
          features?: string[] | null
          hsn_code?: string | null
          id?: string
          images?: Json | null
          installation_available?: boolean
          is_active?: boolean | null
          is_featured?: boolean | null
          lead_count?: number | null
          lead_time?: string | null
          min_order_quantity?: number | null
          min_order_value?: number | null
          min_purchase_qty?: number | null
          model?: string | null
          moq?: number | null
          moq_unit?: string | null
          mrp?: number | null
          name?: string
          payment_methods?: string[] | null
          pickup_available?: boolean
          price?: number | null
          price_max?: number | null
          price_min?: number | null
          price_unit?: string | null
          primary_image_url?: string | null
          product_condition?: string | null
          rank_score?: number | null
          replacement_available?: boolean
          return_policy?: string | null
          return_window_days?: number | null
          search_embedding?: unknown
          seller_id?: string
          selling_mode?: string
          selling_price?: number | null
          shipping_info?: string | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          spec_sheet_url?: string | null
          specifications?: Json | null
          stock_availability?: string | null
          stock_quantity?: number | null
          supply_capacity?: string | null
          tags?: string[] | null
          unit?: string | null
          updated_at?: string
          variants?: Json
          video_url?: string | null
          view_count?: number | null
          warranty?: string | null
          wholesale_tiers?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          phone: string | null
          role: string | null
          show_visitor_data: boolean | null
          state: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          phone?: string | null
          role?: string | null
          show_visitor_data?: boolean | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: string | null
          show_visitor_data?: boolean | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          from_path: string
          id: string
          status_code: number
          to_path: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          from_path: string
          id?: string
          status_code?: number
          to_path: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          from_path?: string
          id?: string
          status_code?: number
          to_path?: string
        }
        Relationships: []
      }
      requirements: {
        Row: {
          attachments: Json
          budget_max: number | null
          budget_min: number | null
          buyer_id: string | null
          category_id: string | null
          city: string | null
          country: string | null
          created_at: string
          delivery_timeline: string | null
          description: string | null
          expected_delivery: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          is_public: boolean | null
          location: string | null
          preferred_delivery_date: string | null
          quantity: number | null
          quantity_unit: string | null
          response_count: number
          size_spec: string | null
          specifications: Json | null
          state: string | null
          status: string | null
          title: string
          unit: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string | null
          category_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_timeline?: string | null
          description?: string | null
          expected_delivery?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          preferred_delivery_date?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          response_count?: number
          size_spec?: string | null
          specifications?: Json | null
          state?: string | null
          status?: string | null
          title: string
          unit?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          attachments?: Json
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string | null
          category_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_timeline?: string | null
          description?: string | null
          expected_delivery?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          preferred_delivery_date?: string | null
          quantity?: number | null
          quantity_unit?: string | null
          response_count?: number
          size_spec?: string | null
          specifications?: Json | null
          state?: string | null
          status?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirements_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          buyer_id: string | null
          created_at: string
          device_id: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          is_verified: boolean | null
          is_visible: boolean | null
          product_id: string | null
          rating: number
          review: string | null
          seller_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          device_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_verified?: boolean | null
          is_visible?: boolean | null
          product_id?: string | null
          rating: number
          review?: string | null
          seller_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          device_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_verified?: boolean | null
          is_visible?: boolean | null
          product_id?: string | null
          rating?: number
          review?: string | null
          seller_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_suppliers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_suppliers_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      search_logs: {
        Row: {
          category_id: string | null
          created_at: string
          filters: Json | null
          id: string
          query: string | null
          result_count: number | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          query?: string | null
          result_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          query?: string | null
          result_count?: number | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_availability: {
        Row: {
          auto_response_enabled: boolean
          auto_response_message: string | null
          available_from: string
          available_to: string
          created_at: string
          id: string
          is_available: boolean
          max_leads_per_day: number | null
          seller_id: string
          timezone: string | null
          updated_at: string
          vacation_mode: boolean | null
          vacation_until: string | null
          working_hours: Json | null
        }
        Insert: {
          auto_response_enabled?: boolean
          auto_response_message?: string | null
          available_from?: string
          available_to?: string
          created_at?: string
          id?: string
          is_available?: boolean
          max_leads_per_day?: number | null
          seller_id: string
          timezone?: string | null
          updated_at?: string
          vacation_mode?: boolean | null
          vacation_until?: string | null
          working_hours?: Json | null
        }
        Update: {
          auto_response_enabled?: boolean
          auto_response_message?: string | null
          available_from?: string
          available_to?: string
          created_at?: string
          id?: string
          is_available?: boolean
          max_leads_per_day?: number | null
          seller_id?: string
          timezone?: string | null
          updated_at?: string
          vacation_mode?: boolean | null
          vacation_until?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_availability_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          about: string | null
          address: string | null
          annual_turnover: string | null
          approved_at: string | null
          avg_rating: number | null
          avg_response_time: number | null
          banner_url: string | null
          brand_names: string[] | null
          business_category: string | null
          business_name: string | null
          business_type: string | null
          certifications: Json | null
          cin: string | null
          city: string | null
          company_name: string | null
          converted_leads: number | null
          country: string | null
          created_at: string
          deal_success_score: number
          description: string | null
          dispute_penalty: number
          email: string | null
          employee_count: string | null
          established_year: number | null
          export_countries: string[] | null
          feedback_score: number
          gallery: Json
          gst_number: string | null
          gstin: string | null
          id: string
          is_approved: boolean | null
          is_featured: boolean | null
          kyc_score: number
          kyc_status: Database["public"]["Enums"]["kyc_status"] | null
          leads_used_this_month: number
          logo_url: string | null
          manufacturing_capacity: string | null
          niches: string[] | null
          pan: string | null
          pan_number: string | null
          payment_modes: string[] | null
          phone: string | null
          pincode: string | null
          primary_category_id: string | null
          quality_standards: string[] | null
          rejection_reason: string | null
          response_rate: number | null
          response_time_minutes: number | null
          response_time_score: number
          slug: string | null
          social_links: Json | null
          state: string | null
          status: string | null
          subscription_ends_at: string | null
          subscription_plan_id: string | null
          tagline: string | null
          total_leads: number | null
          total_reviews: number | null
          trust_score: number | null
          updated_at: string
          user_id: string
          verification_status: string | null
          website: string | null
          whatsapp: string | null
          year_established: number | null
        }
        Insert: {
          about?: string | null
          address?: string | null
          annual_turnover?: string | null
          approved_at?: string | null
          avg_rating?: number | null
          avg_response_time?: number | null
          banner_url?: string | null
          brand_names?: string[] | null
          business_category?: string | null
          business_name?: string | null
          business_type?: string | null
          certifications?: Json | null
          cin?: string | null
          city?: string | null
          company_name?: string | null
          converted_leads?: number | null
          country?: string | null
          created_at?: string
          deal_success_score?: number
          description?: string | null
          dispute_penalty?: number
          email?: string | null
          employee_count?: string | null
          established_year?: number | null
          export_countries?: string[] | null
          feedback_score?: number
          gallery?: Json
          gst_number?: string | null
          gstin?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          kyc_score?: number
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          leads_used_this_month?: number
          logo_url?: string | null
          manufacturing_capacity?: string | null
          niches?: string[] | null
          pan?: string | null
          pan_number?: string | null
          payment_modes?: string[] | null
          phone?: string | null
          pincode?: string | null
          primary_category_id?: string | null
          quality_standards?: string[] | null
          rejection_reason?: string | null
          response_rate?: number | null
          response_time_minutes?: number | null
          response_time_score?: number
          slug?: string | null
          social_links?: Json | null
          state?: string | null
          status?: string | null
          subscription_ends_at?: string | null
          subscription_plan_id?: string | null
          tagline?: string | null
          total_leads?: number | null
          total_reviews?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
          website?: string | null
          whatsapp?: string | null
          year_established?: number | null
        }
        Update: {
          about?: string | null
          address?: string | null
          annual_turnover?: string | null
          approved_at?: string | null
          avg_rating?: number | null
          avg_response_time?: number | null
          banner_url?: string | null
          brand_names?: string[] | null
          business_category?: string | null
          business_name?: string | null
          business_type?: string | null
          certifications?: Json | null
          cin?: string | null
          city?: string | null
          company_name?: string | null
          converted_leads?: number | null
          country?: string | null
          created_at?: string
          deal_success_score?: number
          description?: string | null
          dispute_penalty?: number
          email?: string | null
          employee_count?: string | null
          established_year?: number | null
          export_countries?: string[] | null
          feedback_score?: number
          gallery?: Json
          gst_number?: string | null
          gstin?: string | null
          id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          kyc_score?: number
          kyc_status?: Database["public"]["Enums"]["kyc_status"] | null
          leads_used_this_month?: number
          logo_url?: string | null
          manufacturing_capacity?: string | null
          niches?: string[] | null
          pan?: string | null
          pan_number?: string | null
          payment_modes?: string[] | null
          phone?: string | null
          pincode?: string | null
          primary_category_id?: string | null
          quality_standards?: string[] | null
          rejection_reason?: string | null
          response_rate?: number | null
          response_time_minutes?: number | null
          response_time_score?: number
          slug?: string | null
          social_links?: Json | null
          state?: string | null
          status?: string | null
          subscription_ends_at?: string | null
          subscription_plan_id?: string | null
          tagline?: string | null
          total_leads?: number | null
          total_reviews?: number | null
          trust_score?: number | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          website?: string | null
          whatsapp?: string | null
          year_established?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_profiles_plan_id_fkey"
            columns: ["subscription_plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_profiles_primary_category_id_fkey"
            columns: ["primary_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_subscriptions: {
        Row: {
          amount_paid: number | null
          created_at: string
          expires_at: string | null
          id: string
          payment_ref: string | null
          plan_id: string
          seller_id: string
          started_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_ref?: string | null
          plan_id: string
          seller_id: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          payment_ref?: string | null
          plan_id?: string
          seller_id?: string
          started_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_subscriptions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_metadata: {
        Row: {
          canonical: string | null
          content_outline: Json | null
          created_at: string
          description: string | null
          entity_id: string
          entity_type: string
          generated_at: string
          h1: string | null
          id: string
          intro_html: string | null
          json_ld: Json | null
          keywords: string[] | null
          og_image: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          canonical?: string | null
          content_outline?: Json | null
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: string
          generated_at?: string
          h1?: string | null
          id?: string
          intro_html?: string | null
          json_ld?: Json | null
          keywords?: string[] | null
          og_image?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          canonical?: string | null
          content_outline?: Json | null
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          generated_at?: string
          h1?: string | null
          id?: string
          intro_html?: string | null
          json_ld?: Json | null
          keywords?: string[] | null
          og_image?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_snapshots: {
        Row: {
          expires_at: string
          html: string
          path: string
          rendered_at: string
        }
        Insert: {
          expires_at?: string
          html: string
          path: string
          rendered_at?: string
        }
        Update: {
          expires_at?: string
          html?: string
          path?: string
          rendered_at?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          category_id: string | null
          certifications: string[] | null
          city: string | null
          created_at: string
          currency: string | null
          custom_fields: Json | null
          description: string | null
          emergency_service: boolean | null
          id: string
          images: string[] | null
          is_active: boolean | null
          min_charges: number | null
          price: number | null
          response_time: string | null
          seller_id: string
          service_radius_km: number | null
          slug: string | null
          state: string | null
          team_size: string | null
          title: string
          unit: string | null
          updated_at: string
          view_count: number | null
          warranty: string | null
          working_hours: Json | null
        }
        Insert: {
          category_id?: string | null
          certifications?: string[] | null
          city?: string | null
          created_at?: string
          currency?: string | null
          custom_fields?: Json | null
          description?: string | null
          emergency_service?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          min_charges?: number | null
          price?: number | null
          response_time?: string | null
          seller_id: string
          service_radius_km?: number | null
          slug?: string | null
          state?: string | null
          team_size?: string | null
          title: string
          unit?: string | null
          updated_at?: string
          view_count?: number | null
          warranty?: string | null
          working_hours?: Json | null
        }
        Update: {
          category_id?: string | null
          certifications?: string[] | null
          city?: string | null
          created_at?: string
          currency?: string | null
          custom_fields?: Json | null
          description?: string | null
          emergency_service?: boolean | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          min_charges?: number | null
          price?: number | null
          response_time?: string | null
          seller_id?: string
          service_radius_km?: number | null
          slug?: string | null
          state?: string | null
          team_size?: string | null
          title?: string
          unit?: string | null
          updated_at?: string
          view_count?: number | null
          warranty?: string | null
          working_hours?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      slugs: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_primary: boolean
          slug: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_primary?: boolean
          slug: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_primary?: boolean
          slug?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          analytics_access: boolean | null
          boost_multiplier: number | null
          created_at: string
          description: string | null
          featured_listing: boolean | null
          featured_products: number
          features: Json | null
          id: string
          is_active: boolean | null
          lead_quota: number | null
          leads_per_month: number
          max_leads_per_month: number | null
          max_products: number | null
          name: string
          price_monthly: number
          price_yearly: number
          priority_support: boolean | null
          show_contact_details: boolean
          slug: string | null
          sort_order: number | null
          tier: string | null
          updated_at: string
          verified_badge: boolean
        }
        Insert: {
          analytics_access?: boolean | null
          boost_multiplier?: number | null
          created_at?: string
          description?: string | null
          featured_listing?: boolean | null
          featured_products?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          lead_quota?: number | null
          leads_per_month?: number
          max_leads_per_month?: number | null
          max_products?: number | null
          name: string
          price_monthly?: number
          price_yearly?: number
          priority_support?: boolean | null
          show_contact_details?: boolean
          slug?: string | null
          sort_order?: number | null
          tier?: string | null
          updated_at?: string
          verified_badge?: boolean
        }
        Update: {
          analytics_access?: boolean | null
          boost_multiplier?: number | null
          created_at?: string
          description?: string | null
          featured_listing?: boolean | null
          featured_products?: number
          features?: Json | null
          id?: string
          is_active?: boolean | null
          lead_quota?: number | null
          leads_per_month?: number
          max_leads_per_month?: number | null
          max_products?: number | null
          name?: string
          price_monthly?: number
          price_yearly?: number
          priority_support?: boolean | null
          show_contact_details?: boolean
          slug?: string | null
          sort_order?: number | null
          tier?: string | null
          updated_at?: string
          verified_badge?: boolean
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      visitor_devices: {
        Row: {
          city: string | null
          created_at: string
          device_id: string
          email: string | null
          enquiry_count: number
          first_seen_at: string
          last_seen_at: string
          metadata: Json
          name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          device_id: string
          email?: string | null
          enquiry_count?: number
          first_seen_at?: string
          last_seen_at?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          device_id?: string
          email?: string | null
          enquiry_count?: number
          first_seen_at?: string
          last_seen_at?: string
          metadata?: Json
          name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      visitor_page_views: {
        Row: {
          category_id: string | null
          created_at: string
          device_id: string | null
          duration_seconds: number
          id: string
          metadata: Json
          page_path: string | null
          page_type: string
          product_id: string | null
          referrer: string | null
          seller_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number
          id?: string
          metadata?: Json
          page_path?: string | null
          page_type: string
          product_id?: string | null
          referrer?: string | null
          seller_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          device_id?: string | null
          duration_seconds?: number
          id?: string
          metadata?: Json
          page_path?: string | null
          page_type?: string
          product_id?: string | null
          referrer?: string | null
          seller_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "visitor_page_views_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_page_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visitor_page_views_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_requirement_to_sellers: {
        Args: { p_requirement_id: string; p_seller_ids: string[] }
        Returns: Json
      }
      broadcast_rfq_to_top_sellers: {
        Args: {
          p_buyer_city?: string
          p_device_id?: string
          p_guest_email?: string
          p_guest_name: string
          p_guest_phone: string
          p_max_sellers?: number
          p_message?: string
          p_product_id: string
          p_quantity?: number
          p_unit?: string
        }
        Returns: Json
      }
      calculate_buyer_intent: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: number
      }
      can_access_conversation: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      get_category_price_benchmark: {
        Args: { p_category_id: string; p_city?: string }
        Returns: Json
      }
      get_matched_requirements_for_seller: {
        Args: never
        Returns: {
          budget_max: number
          budget_min: number
          category_id: string
          category_name: string
          city: string
          created_at: string
          description: string
          match_score: number
          preferred_delivery_date: string
          quantity: number
          quantity_unit: string
          requirement_id: string
          title: string
          urgency: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_seller_profile_owner: {
        Args: { _seller_id: string; _user_id: string }
        Returns: boolean
      }
      match_products: {
        Args: {
          match_count?: number
          p_city?: string
          query_embedding: unknown
        }
        Returns: {
          category_id: string
          currency: string
          id: string
          name: string
          price: number
          primary_image_url: string
          seller_business_name: string
          seller_city: string
          seller_id: string
          seller_slug: string
          short_description: string
          similarity: number
          slug: string
          unit: string
        }[]
      }
      match_sellers_for_requirement: {
        Args: { p_requirement_id: string }
        Returns: {
          business_name: string
          city: string
          match_score: number
          product_count: number
          seller_id: string
          slug: string
          trust_score: number
        }[]
      }
      record_local_page_view: {
        Args: {
          p_device_id: string
          p_page_id: string
          p_path: string
          p_referrer: string
          p_session_id: string
          p_user_agent: string
        }
        Returns: undefined
      }
      record_product_view: {
        Args: {
          p_product_id: string
          p_referrer?: string
          p_session_id?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      record_visitor_page_view: {
        Args: {
          p_category_id?: string
          p_device_id?: string
          p_metadata?: Json
          p_page_path?: string
          p_page_type: string
          p_product_id?: string
          p_referrer?: string
          p_seller_id?: string
          p_session_id?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      route_lead_to_seller: { Args: { p_lead_id: string }; Returns: Json }
      seller_has_active_product: {
        Args: { _seller_id: string }
        Returns: boolean
      }
      sync_product_view_counts: { Args: never; Returns: undefined }
      update_deal_stage: {
        Args: { p_deal_id: string; p_new_stage_id: string; p_notes?: string }
        Returns: Json
      }
      update_product_view_duration: {
        Args: { p_duration: number; p_view_id: string }
        Returns: undefined
      }
      update_visitor_page_view_duration: {
        Args: { p_duration: number; p_view_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "seller" | "buyer" | "sales_agent"
      deal_stage:
        | "lead"
        | "contacted"
        | "quoted"
        | "negotiation"
        | "won"
        | "lost"
      kyc_status: "pending" | "verified" | "rejected"
      lead_status:
        | "new"
        | "assigned"
        | "contacted"
        | "quoted"
        | "won"
        | "lost"
        | "expired"
        | "interested"
        | "converted"
      subscription_status: "active" | "expired" | "cancelled" | "trial"
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
      app_role: ["admin", "seller", "buyer", "sales_agent"],
      deal_stage: ["lead", "contacted", "quoted", "negotiation", "won", "lost"],
      kyc_status: ["pending", "verified", "rejected"],
      lead_status: [
        "new",
        "assigned",
        "contacted",
        "quoted",
        "won",
        "lost",
        "expired",
        "interested",
        "converted",
      ],
      subscription_status: ["active", "expired", "cancelled", "trial"],
    },
  },
} as const
