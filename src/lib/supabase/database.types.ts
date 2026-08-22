/**
 * Generated from the FreshFork Supabase project (`supabase gen types typescript`).
 * Regenerate after every migration — do not hand-edit.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          full_name?: string | null;
          id?: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      vendors: {
        Row: {
          avatar_image_path: string | null;
          business_name: string;
          cert_doc_path: string | null;
          cert_expires_on: string | null;
          certification_label: string | null;
          created_at: string;
          cuisine: string | null;
          handle: string;
          hero_image_path: string | null;
          id: string;
          is_live: boolean;
          kitchen_type: string | null;
          location: unknown;
          onboarding_step: string;
          pickup_address_line: string | null;
          pickup_city: string | null;
          pickup_postal_code: string | null;
          pickup_state: string | null;
          profile_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["vendor_status"];
          status_note: string | null;
          story: string | null;
          stripe_account_id: string | null;
          stripe_charges_enabled: boolean;
          stripe_connect_status: Database["public"]["Enums"]["connect_status"];
          stripe_payouts_enabled: boolean;
          updated_at: string;
          verified_since: string | null;
        };
        Insert: {
          avatar_image_path?: string | null;
          business_name: string;
          cert_doc_path?: string | null;
          cert_expires_on?: string | null;
          certification_label?: string | null;
          created_at?: string;
          cuisine?: string | null;
          handle: string;
          hero_image_path?: string | null;
          id?: string;
          is_live?: boolean;
          kitchen_type?: string | null;
          location?: unknown;
          onboarding_step?: string;
          pickup_address_line?: string | null;
          pickup_city?: string | null;
          pickup_postal_code?: string | null;
          pickup_state?: string | null;
          profile_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["vendor_status"];
          status_note?: string | null;
          story?: string | null;
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          stripe_connect_status?: Database["public"]["Enums"]["connect_status"];
          stripe_payouts_enabled?: boolean;
          updated_at?: string;
          verified_since?: string | null;
        };
        Update: {
          avatar_image_path?: string | null;
          business_name?: string;
          cert_doc_path?: string | null;
          cert_expires_on?: string | null;
          certification_label?: string | null;
          created_at?: string;
          cuisine?: string | null;
          handle?: string;
          hero_image_path?: string | null;
          id?: string;
          is_live?: boolean;
          kitchen_type?: string | null;
          location?: unknown;
          onboarding_step?: string;
          pickup_address_line?: string | null;
          pickup_city?: string | null;
          pickup_postal_code?: string | null;
          pickup_state?: string | null;
          profile_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["vendor_status"];
          status_note?: string | null;
          story?: string | null;
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          stripe_connect_status?: Database["public"]["Enums"]["connect_status"];
          stripe_payouts_enabled?: boolean;
          updated_at?: string;
          verified_since?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vendors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vendors_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      menu_items: {
        Row: {
          allergens: string[];
          created_at: string;
          description: string | null;
          dietary_tags: string[];
          id: string;
          is_available: boolean;
          name: string;
          photo_path: string | null;
          prep_note: string | null;
          price_cents: number;
          quantity_available: number | null;
          section: string;
          sort_order: number;
          updated_at: string;
          vendor_id: string;
        };
        Insert: {
          allergens?: string[];
          created_at?: string;
          description?: string | null;
          dietary_tags?: string[];
          id?: string;
          is_available?: boolean;
          name: string;
          photo_path?: string | null;
          prep_note?: string | null;
          price_cents: number;
          quantity_available?: number | null;
          section?: string;
          sort_order?: number;
          updated_at?: string;
          vendor_id: string;
        };
        Update: {
          allergens?: string[];
          created_at?: string;
          description?: string | null;
          dietary_tags?: string[];
          id?: string;
          is_available?: boolean;
          name?: string;
          photo_path?: string | null;
          prep_note?: string | null;
          price_cents?: number;
          quantity_available?: number | null;
          section?: string;
          sort_order?: number;
          updated_at?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "menu_items_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      pickup_windows: {
        Row: {
          created_at: string;
          day_of_week: number;
          end_time: string;
          id: string;
          is_active: boolean;
          start_time: string;
          vendor_id: string;
        };
        Insert: {
          created_at?: string;
          day_of_week: number;
          end_time: string;
          id?: string;
          is_active?: boolean;
          start_time: string;
          vendor_id: string;
        };
        Update: {
          created_at?: string;
          day_of_week?: number;
          end_time?: string;
          id?: string;
          is_active?: boolean;
          start_time?: string;
          vendor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pickup_windows_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: { Args: { uid?: string }; Returns: boolean };
      submit_vendor_for_review: {
        Args: { p_vendor_id: string };
        Returns: Database["public"]["Enums"]["vendor_status"];
      };
      discovery_stats: {
        Args: {
          p_lat?: number | null;
          p_lng?: number | null;
          p_radius_m?: number | null;
        };
        Returns: {
          live_vendors: number;
          live_dishes: number;
          cuisines: number;
        }[];
      };
      search_menu_items: {
        Args: {
          p_lat?: number | null;
          p_lng?: number | null;
          p_radius_m?: number | null;
          p_cuisines?: string[] | null;
          p_dietary?: string[] | null;
          p_price_min_cents?: number | null;
          p_price_max_cents?: number | null;
          p_availability?: string | null;
          p_pickup_windows?: string[] | null;
          p_sort?: string | null;
          p_limit?: number | null;
          p_offset?: number | null;
        };
        Returns: {
          menu_item_id: string;
          vendor_id: string;
          vendor_handle: string;
          vendor_name: string;
          cuisine: string | null;
          dish_name: string;
          description: string | null;
          price_cents: number;
          photo_path: string | null;
          prep_note: string | null;
          dietary_tags: string[];
          allergens: string[];
          quantity_available: number | null;
          lat: number | null;
          lng: number | null;
          distance_m: number | null;
          total_count: number;
        }[];
      };
    };
    Enums: {
      connect_status: "not_started" | "onboarding" | "restricted" | "complete";
      user_role: "customer" | "vendor" | "admin";
      vendor_status:
        | "draft"
        | "pending_review"
        | "changes_requested"
        | "approved"
        | "suspended";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Database["public"]["Enums"]["user_role"];

export type Vendor = Database["public"]["Tables"]["vendors"]["Row"];
export type VendorStatus = Database["public"]["Enums"]["vendor_status"];
export type ConnectStatus = Database["public"]["Enums"]["connect_status"];

export type MenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
export type PickupWindow = Database["public"]["Tables"]["pickup_windows"]["Row"];

export const USER_ROLES = ["customer", "vendor", "admin"] as const;
export const VENDOR_STATUSES = [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "suspended",
] as const;
