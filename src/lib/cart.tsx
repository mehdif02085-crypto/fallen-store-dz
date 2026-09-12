import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type CustomSpec = {
  shirt_model: string;
  shirt_color_name: string;
  shirt_color_hex: string;
  size: string;
  design_image_url: string | null;
  custom_text: string | null;
  text_color: string | null;
  position: string;
};

export type CartItem = {
  key: string;
  kind: "product" | "custom";
  name: string;
  /** Display price only — the server always recomputes the real price. */
  unitPrice: number;
  quantity: number;
  size: string;
  colorName: string;
  image: string | null;
  slug?: string;
  variantId?: string;
  maxStock?: number;
  custom?: CustomSpec;
};

type Ctx = {
  items: CartItem[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartItem, "key"> & { key?: string }) => void;
  setQuantity: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  ready: boolean;
};

const CartContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "fallen.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw) as CartItem[]);
    } catch {
      /* ignore corrupted cart */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const add: Ctx["add"] = useCallback((item) => {
    const key =
      item.key ??
      (item.kind === "product"
        ? `p:${item.variantId}`
        : `c:${Math.random().toString(36).slice(2, 10)}`);
    setItems((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        const max = existing.maxStock ?? 20;
        return prev.map((i) =>
          i.key === key
            ? { ...i, quantity: Math.min(max, i.quantity + item.quantity) }
            : i,
        );
      }
      return [...prev, { ...item, key } as CartItem];
    });
  }, []);

  const setQuantity = useCallback((key: string, qty: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.key !== key) return [i];
        const max = Math.min(i.maxStock ?? 20, 20);
        const next = Math.min(max, Math.max(0, qty));
        return next === 0 ? [] : [{ ...i, quantity: next }];
      }),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<Ctx>(() => {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return { items, count, subtotal, add, setQuantity, remove, clear, ready };
  }, [items, add, setQuantity, remove, clear, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
