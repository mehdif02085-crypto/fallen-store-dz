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
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name_ar: string
          name_fr: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar: string
          name_fr: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name_ar?: string
          name_fr?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      custom_designs: {
        Row: {
          created_at: string
          custom_text: string | null
          design_image_url: string | null
          id: string
          position: string
          price_da: number
          shirt_color_hex: string
          shirt_color_name: string
          shirt_model: string
          size: string
          text_color: string | null
        }
        Insert: {
          created_at?: string
          custom_text?: string | null
          design_image_url?: string | null
          id?: string
          position?: string
          price_da: number
          shirt_color_hex: string
          shirt_color_name: string
          shirt_model: string
          size: string
          text_color?: string | null
        }
        Update: {
          created_at?: string
          custom_text?: string | null
          design_image_url?: string | null
          id?: string
          position?: string
          price_da?: number
          shirt_color_hex?: string
          shirt_color_name?: string
          shirt_model?: string
          size?: string
          text_color?: string | null
        }
        Relationships: []
      }
      custom_shirt_settings: {
        Row: {
          base_price_da: number
          id: boolean
          image_print_surcharge_da: number
          is_enabled: boolean
          text_print_surcharge_da: number
          updated_at: string
        }
        Insert: {
          base_price_da?: number
          id?: boolean
          image_print_surcharge_da?: number
          is_enabled?: boolean
          text_print_surcharge_da?: number
          updated_at?: string
        }
        Update: {
          base_price_da?: number
          id?: boolean
          image_print_surcharge_da?: number
          is_enabled?: boolean
          text_print_surcharge_da?: number
          updated_at?: string
        }
        Relationships: []
      }
      delivery_settings: {
        Row: {
          default_fee_da: number
          free_shipping_threshold_da: number | null
          id: boolean
          updated_at: string
        }
        Insert: {
          default_fee_da?: number
          free_shipping_threshold_da?: number | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          default_fee_da?: number
          free_shipping_threshold_da?: number | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          color_name: string | null
          custom_design_id: string | null
          id: string
          line_total_da: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          size: string | null
          unit_price_da: number
          variant_id: string | null
        }
        Insert: {
          color_name?: string | null
          custom_design_id?: string | null
          id?: string
          line_total_da: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          size?: string | null
          unit_price_da: number
          variant_id?: string | null
        }
        Update: {
          color_name?: string | null
          custom_design_id?: string | null
          id?: string
          line_total_da?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
          unit_price_da?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_custom_design_id_fkey"
            columns: ["custom_design_id"]
            isOneToOne: false
            referencedRelation: "custom_designs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string
          city: string
          clothing_size: string | null
          created_at: string
          customer_name: string
          delivery_fee_da: number
          delivery_notes: string | null
          id: string
          order_number: string
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_da: number
          total_da: number
          updated_at: string
          user_id: string | null
          wilaya_code: number
          wilaya_name: string
        }
        Insert: {
          address: string
          city: string
          clothing_size?: string | null
          created_at?: string
          customer_name: string
          delivery_fee_da: number
          delivery_notes?: string | null
          id?: string
          order_number: string
          payment_method: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_da: number
          total_da: number
          updated_at?: string
          user_id?: string | null
          wilaya_code: number
          wilaya_name: string
        }
        Update: {
          address?: string
          city?: string
          clothing_size?: string | null
          created_at?: string
          customer_name?: string
          delivery_fee_da?: number
          delivery_notes?: string | null
          id?: string
          order_number?: string
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_da?: number
          total_da?: number
          updated_at?: string
          user_id?: string | null
          wilaya_code?: number
          wilaya_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_payment_method_fkey"
            columns: ["payment_method"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "orders_wilaya_code_fkey"
            columns: ["wilaya_code"]
            isOneToOne: false
            referencedRelation: "wilayas"
            referencedColumns: ["code"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          description_ar: string | null
          description_fr: string | null
          is_enabled: boolean
          name_ar: string
          name_fr: string
          requires_credentials: boolean
          sort_order: number
        }
        Insert: {
          code: string
          description_ar?: string | null
          description_fr?: string | null
          is_enabled?: boolean
          name_ar: string
          name_fr: string
          requires_credentials?: boolean
          sort_order?: number
        }
        Update: {
          code?: string
          description_ar?: string | null
          description_fr?: string | null
          is_enabled?: boolean
          name_ar?: string
          name_fr?: string
          requires_credentials?: boolean
          sort_order?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount_da: number
          created_at: string
          id: string
          order_id: string
          provider: string
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_da: number
          created_at?: string
          id?: string
          order_id: string
          provider: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_da?: number
          created_at?: string
          id?: string
          order_id?: string
          provider?: string
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          square_url: string | null
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          square_url?: string | null
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          square_url?: string | null
          url?: string
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
      product_variants: {
        Row: {
          color_hex: string
          color_name: string
          created_at: string
          id: string
          product_id: string
          size: string
          stock: number
        }
        Insert: {
          color_hex?: string
          color_name?: string
          created_at?: string
          id?: string
          product_id: string
          size: string
          stock?: number
        }
        Update: {
          color_hex?: string
          color_name?: string
          created_at?: string
          id?: string
          product_id?: string
          size?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description_ar: string | null
          description_fr: string | null
          id: string
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          is_new: boolean
          name: string
          price_da: number
          sale_price_da: number | null
          slug: string
          subtitle: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new?: boolean
          name: string
          price_da: number
          sale_price_da?: number | null
          slug: string
          subtitle?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description_ar?: string | null
          description_fr?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new?: boolean
          name?: string
          price_da?: number
          sale_price_da?: number | null
          slug?: string
          subtitle?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
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
      wilayas: {
        Row: {
          code: number
          delivery_fee_da: number
          name_ar: string
          name_fr: string
        }
        Insert: {
          code: number
          delivery_fee_da?: number
          name_ar: string
          name_fr: string
        }
        Update: {
          code?: number
          delivery_fee_da?: number
          name_ar?: string
          name_fr?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_order_by_number: {
        Args: { p_order_number: string; p_phone: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      place_order: {
        Args: { p_customer: Json; p_items: Json; p_payment_method: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_status: "unpaid" | "pending" | "paid" | "failed" | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_status: ["unpaid", "pending", "paid", "failed", "refunded"],
    },
  },
} as const
