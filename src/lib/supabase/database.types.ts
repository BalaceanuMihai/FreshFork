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
      memberships: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          plan: Database["public"]["Enums"]["membership_plan"];
          profile_id: string;
          status: Database["public"]["Enums"]["membership_status"];
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          plan?: Database["public"]["Enums"]["membership_plan"];
          profile_id: string;
          status?: Database["public"]["Enums"]["membership_status"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          plan?: Database["public"]["Enums"]["membership_plan"];
          profile_id?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "memberships_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          full_name: string | null;
          id: string;
          phone: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          full_name?: string | null;
          id: string;
          phone?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
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
          country: string | null;
          profile_id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["vendor_status"];
          status_note: string | null;
          story: string | null;
          timezone: string;
          currency: string;
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
          country?: string | null;
          profile_id: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["vendor_status"];
          status_note?: string | null;
          story?: string | null;
          timezone?: string;
          currency?: string;
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
          country?: string | null;
          profile_id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["vendor_status"];
          status_note?: string | null;
          story?: string | null;
          timezone?: string;
          currency?: string;
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
      orders: {
        Row: {
          accepted_at: string | null;
          cancel_reason: string | null;
          canceled_at: string | null;
          canceled_by: string | null;
          code: string;
          completed_at: string | null;
          created_at: string;
          currency: string;
          customer_id: string;
          customer_note: string | null;
          disputed_at: string | null;
          id: string;
          paid_at: string | null;
          pickup_at: string;
          pickup_ends_at: string;
          pickup_window_id: string | null;
          platform_fee_bps: number;
          platform_fee_cents: number;
          ready_at: string | null;
          refund_state: Database["public"]["Enums"]["refund_state"];
          refunded_cents: number;
          service_fee_cents: number;
          status: Database["public"]["Enums"]["order_status"];
          stock_returned: boolean;
          stripe_charge_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_payment_intent_id: string | null;
          stripe_transfer_id: string | null;
          subtotal_cents: number;
          total_cents: number;
          updated_at: string;
          vendor_id: string;
          vendor_note: string | null;
          vendor_payout_cents: number;
        };
        // Orders are born in create_order() and advanced by the lifecycle
        // functions. The only column the app ever writes directly is the
        // PaymentIntent id, attached with the service-role client.
        Insert: never;
        Update: {
          stripe_checkout_session_id?: string | null;
          stripe_payment_intent_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          allergens_snapshot: string[];
          created_at: string;
          dietary_snapshot: string[];
          id: string;
          line_total_cents: number;
          menu_item_id: string | null;
          name_snapshot: string;
          order_id: string;
          prep_note_snapshot: string | null;
          quantity: number;
          section_snapshot: string | null;
          unit_price_cents: number;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_settings: {
        Row: {
          customer_cancel_cutoff_minutes: number;
          id: boolean;
          max_open_checkouts: number;
          max_pickup_days_ahead: number;
          order_lead_minutes: number;
          pending_payment_ttl_minutes: number;
          platform_fee_bps: number;
          service_fee_bps: number;
          service_fee_max_cents: number;
          service_fee_min_cents: number;
          updated_at: string;
        };
        Insert: {
          customer_cancel_cutoff_minutes?: number;
          id?: boolean;
          max_open_checkouts?: number;
          max_pickup_days_ahead?: number;
          order_lead_minutes?: number;
          pending_payment_ttl_minutes?: number;
          platform_fee_bps?: number;
          service_fee_bps?: number;
          service_fee_max_cents?: number;
          service_fee_min_cents?: number;
          updated_at?: string;
        };
        Update: {
          customer_cancel_cutoff_minutes?: number;
          max_open_checkouts?: number;
          max_pickup_days_ahead?: number;
          order_lead_minutes?: number;
          pending_payment_ttl_minutes?: number;
          platform_fee_bps?: number;
          service_fee_bps?: number;
          service_fee_max_cents?: number;
          service_fee_min_cents?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      payout_ledger: {
        Row: {
          amount_cents: number;
          created_at: string;
          currency: string;
          id: number;
          kind: Database["public"]["Enums"]["ledger_kind"];
          metadata: Json;
          occurred_at: string;
          order_id: string | null;
          stripe_object_id: string | null;
          vendor_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "payout_ledger_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          body: string | null;
          created_at: string;
          customer_id: string;
          hidden_by: string | null;
          hidden_reason: string | null;
          id: string;
          is_hidden: boolean;
          order_id: string;
          rating: number;
          updated_at: string;
          vendor_id: string;
          vendor_replied_at: string | null;
          vendor_reply: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: true;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey";
            columns: ["vendor_id"];
            isOneToOne: false;
            referencedRelation: "vendors";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          created_at: string;
          detail: string | null;
          id: string;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string | null;
          resolution_note: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          status: Database["public"]["Enums"]["report_status"];
          subject_id: string;
          subject_type: string;
        };
        Insert: {
          detail?: string | null;
          reason: Database["public"]["Enums"]["report_reason"];
          reporter_id: string;
          subject_id: string;
          subject_type: string;
        };
        Update: {
          resolution_note?: string | null;
          status?: Database["public"]["Enums"]["report_status"];
        };
        Relationships: [];
      };
      admin_actions: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          id: string;
          metadata: Json;
          note: string | null;
          subject_id: string | null;
          subject_type: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          metadata?: Json;
          note?: string | null;
          subject_id?: string | null;
          subject_type: string;
        };
        Update: never;
        Relationships: [];
      };
      storage_orphans: {
        Row: {
          attempts: number;
          bucket: string;
          deleted_at: string | null;
          id: number;
          last_error: string | null;
          object_path: string;
          queued_at: string;
        };
        Insert: { bucket: string; object_path: string };
        Update: {
          attempts?: number;
          deleted_at?: string | null;
          last_error?: string | null;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          error: string | null;
          event_created: string;
          id: string;
          processed_at: string | null;
          received_at: string;
          type: string;
        };
        Insert: { event_created: string; id: string; type: string };
        Update: { error?: string | null; processed_at?: string | null };
        Relationships: [];
      };
      rate_limits: {
        Row: { bucket: string; hits: number; window_start: string };
        Insert: { bucket: string; hits?: number; window_start: string };
        Update: { hits?: number; window_start?: string };
        Relationships: [];
      };
    };
    Views: {
      my_membership: {
        Row: {
          cancel_at_period_end: boolean | null;
          current_period_end: string | null;
          grace_ends_at: string | null;
          plan: Database["public"]["Enums"]["membership_plan"] | null;
          profile_id: string | null;
          status: Database["public"]["Enums"]["membership_status"] | null;
        };
        Relationships: [];
      };
      vendor_ratings: {
        Row: {
          average_rating: number | null;
          review_count: number | null;
          vendor_id: string | null;
        };
        Relationships: [];
      };
      vendor_balances: {
        Row: {
          balance_cents: number | null;
          credited_cents: number | null;
          debited_cents: number | null;
          transferred_cents: number | null;
          vendor_id: string | null;
        };
        Relationships: [];
      };
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
          currency: string;
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

      consume_rate_limit: {
        Args: { p_bucket: string; p_limit: number; p_window_seconds: number };
        Returns: {
          allowed: boolean;
          remaining: number;
          retry_after_seconds: number;
        }[];
      };
      prune_rate_limits: { Args: { p_older_than_seconds?: number }; Returns: number };

      claim_stripe_event: {
        Args: { p_id: string; p_type: string; p_event_created: string };
        Returns: boolean;
      };
      finish_stripe_event: {
        Args: { p_id: string; p_error?: string | null };
        Returns: undefined;
      };
      release_stripe_event: { Args: { p_id: string }; Returns: undefined };

      has_plus_benefits: { Args: { p_profile_id: string }; Returns: boolean };

      create_order: {
        Args: {
          p_vendor_id: string;
          p_items: Json;
          p_pickup_window_id: string;
          p_pickup_date: string;
          p_note?: string | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      advance_order_status: {
        Args: {
          p_order_id: string;
          p_next: Database["public"]["Enums"]["order_status"];
          p_note?: string | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      cancel_order: {
        Args: { p_order_id: string; p_reason?: string | null };
        Returns: Database["public"]["Tables"]["orders"]["Row"];
      };
      mark_order_paid: {
        Args: { p_payment_intent_id: string; p_charge_id?: string | null };
        Returns: Database["public"]["Tables"]["orders"]["Row"] | null;
      };
      fail_order_payment: {
        Args: { p_payment_intent_id: string; p_reason?: string | null };
        Returns: Database["public"]["Tables"]["orders"]["Row"] | null;
      };
      record_order_refund: {
        Args: {
          p_payment_intent_id: string;
          p_refunded_total_cents: number;
          p_stripe_object_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"] | null;
      };
      record_order_dispute: {
        Args: {
          p_charge_id: string;
          p_amount_cents: number;
          p_stripe_object_id: string;
        };
        Returns: Database["public"]["Tables"]["orders"]["Row"] | null;
      };
      record_order_transfer: {
        Args: { p_order_id: string; p_amount_cents: number; p_transfer_id: string };
        Returns: undefined;
      };
      expire_stale_orders: { Args: Record<string, never>; Returns: number };

      vendor_pickup_slots: {
        Args: { p_vendor_id: string; p_days?: number | null };
        Returns: {
          pickup_window_id: string;
          pickup_date: string;
          starts_at: string;
          ends_at: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
        }[];
      };

      submit_review: {
        Args: { p_order_id: string; p_rating: number; p_body?: string | null };
        Returns: Database["public"]["Tables"]["reviews"]["Row"];
      };
      edit_review: {
        Args: { p_review_id: string; p_rating: number; p_body?: string | null };
        Returns: Database["public"]["Tables"]["reviews"]["Row"];
      };
      reply_to_review: {
        Args: { p_review_id: string; p_reply: string };
        Returns: Database["public"]["Tables"]["reviews"]["Row"];
      };
      moderate_review: {
        Args: { p_review_id: string; p_hidden: boolean; p_reason?: string | null };
        Returns: Database["public"]["Tables"]["reviews"]["Row"];
      };

      delete_my_account: { Args: Record<string, never>; Returns: Json };
    };
    Enums: {
      connect_status: "not_started" | "onboarding" | "restricted" | "complete";
      order_status:
        | "pending_payment"
        | "payment_failed"
        | "paid"
        | "accepted"
        | "ready"
        | "completed"
        | "rejected"
        | "canceled"
        | "refunded";
      refund_state: "none" | "partial" | "full";
      ledger_kind:
        | "sale"
        | "service_fee"
        | "platform_fee"
        | "transfer"
        | "refund"
        | "fee_reversal"
        | "dispute"
        | "adjustment";
      report_reason:
        | "food_safety"
        | "allergen_error"
        | "hygiene"
        | "fraud"
        | "offensive"
        | "other";
      report_status: "open" | "reviewing" | "resolved" | "dismissed";
      membership_plan: "free" | "plus";
      membership_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "unpaid";
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

export type Membership = Database["public"]["Tables"]["memberships"]["Row"];
export type MyMembership = Database["public"]["Views"]["my_membership"]["Row"];
export type MembershipPlan = Database["public"]["Enums"]["membership_plan"];
export type MembershipStatus = Database["public"]["Enums"]["membership_status"];

export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type RefundState = Database["public"]["Enums"]["refund_state"];
export type LedgerKind = Database["public"]["Enums"]["ledger_kind"];
export type PayoutLedgerEntry = Database["public"]["Tables"]["payout_ledger"]["Row"];
export type VendorBalance = Database["public"]["Views"]["vendor_balances"]["Row"];
export type PlatformSettings = Database["public"]["Tables"]["platform_settings"]["Row"];

export type Review = Database["public"]["Tables"]["reviews"]["Row"];
export type VendorRating = Database["public"]["Views"]["vendor_ratings"]["Row"];
export type Report = Database["public"]["Tables"]["reports"]["Row"];
export type ReportReason = Database["public"]["Enums"]["report_reason"];
export type ReportStatus = Database["public"]["Enums"]["report_status"];
export type AdminAction = Database["public"]["Tables"]["admin_actions"]["Row"];

export type PickupSlot =
  Database["public"]["Functions"]["vendor_pickup_slots"]["Returns"][number];

export const USER_ROLES = ["customer", "vendor", "admin"] as const;

/** Statuses where the customer is still waiting on something. */
export const OPEN_ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "accepted",
  "ready",
] as const satisfies readonly OrderStatus[];

/** Statuses a vendor sees in their "needs attention" queue. */
export const VENDOR_ACTIONABLE_STATUSES = [
  "paid",
  "accepted",
  "ready",
] as const satisfies readonly OrderStatus[];

export const REPORT_REASONS = [
  "food_safety",
  "allergen_error",
  "hygiene",
  "fraud",
  "offensive",
  "other",
] as const;
export const VENDOR_STATUSES = [
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "suspended",
] as const;
