import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ProductImage = {
  id: string;
  url: string;
  square_url: string | null;
  alt: string | null;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  size: string;
  color_name: string;
  color_hex: string;
  stock: number;
};

export type Category = {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  sort_order: number;
  is_active: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description_fr: string | null;
  description_ar: string | null;
  price_da: number;
  sale_price_da: number | null;
  category_id: string | null;
  is_active: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
  created_at: string;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
  categories: { slug: string; name_fr: string; name_ar: string } | null;
};

export type Wilaya = {
  code: number;
  name_fr: string;
  name_ar: string;
  delivery_fee_da: number;
};

export type PaymentMethod = {
  code: string;
  name_fr: string;
  name_ar: string;
  description_fr: string | null;
  description_ar: string | null;
  is_enabled: boolean;
  requires_credentials: boolean;
  sort_order: number;
};

export type CustomShirtSettings = {
  base_price_da: number;
  image_print_surcharge_da: number;
  text_print_surcharge_da: number;
  is_enabled: boolean;
};

const PRODUCT_SELECT =
  "*, product_images(id,url,square_url,alt,sort_order), product_variants(id,size,color_name,color_hex,stock), categories(slug,name_fr,name_ar)";

export function sortImages(p: Product): ProductImage[] {
  return [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

export function mainImage(p: Product): string | null {
  const imgs = sortImages(p);
  return imgs[0]?.square_url ?? imgs[0]?.url ?? null;
}

export function effectivePrice(p: Product): number {
  return p.sale_price_da ?? p.price_da;
}

export function totalStock(p: Product): number {
  return (p.product_variants ?? []).reduce((s, v) => s + v.stock, 0);
}

export function uniqueSizes(p: Product): string[] {
  const seen: string[] = [];
  for (const v of p.product_variants ?? []) {
    if (!seen.includes(v.size)) seen.push(v.size);
  }
  return seen;
}

export const productsQuery = queryOptions({
  queryKey: ["products"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Product[];
  },
});

export const allProductsAdminQuery = queryOptions({
  queryKey: ["products", "admin"],
  queryFn: async (): Promise<Product[]> => {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_SELECT)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as unknown as Product[];
  },
});

export function productQuery(slug: string) {
  return queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<Product | null> => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Product) ?? null;
    },
  });
}

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as Category[];
  },
});

export const wilayasQuery = queryOptions({
  queryKey: ["wilayas"],
  queryFn: async (): Promise<Wilaya[]> => {
    const { data, error } = await supabase.from("wilayas").select("*").order("code");
    if (error) throw error;
    return (data ?? []) as Wilaya[];
  },
});

export const paymentMethodsQuery = queryOptions({
  queryKey: ["payment_methods"],
  queryFn: async (): Promise<PaymentMethod[]> => {
    const { data, error } = await supabase
      .from("payment_methods")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    return (data ?? []) as PaymentMethod[];
  },
});

export const deliverySettingsQuery = queryOptions({
  queryKey: ["delivery_settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("delivery_settings")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data as {
      default_fee_da: number;
      free_shipping_threshold_da: number | null;
    } | null;
  },
});

export const customSettingsQuery = queryOptions({
  queryKey: ["custom_shirt_settings"],
  queryFn: async (): Promise<CustomShirtSettings | null> => {
    const { data, error } = await supabase
      .from("custom_shirt_settings")
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return (data as CustomShirtSettings) ?? null;
  },
});
