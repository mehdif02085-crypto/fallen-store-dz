import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { allProductsAdminQuery } from "@/lib/queries";

export const Route = createFileRoute("/admin/inventory")({
  component: AdminInventory,
});

function AdminInventory() {
  const queryClient = useQueryClient();
  const { data: products = [] } = useQuery(allProductsAdminQuery);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const setStock = useMutation({
    mutationFn: async (v: { id: string; stock: number }) => {
      const { error: e } = await supabase
        .from("product_variants")
        .update({ stock: Math.max(0, v.stock) })
        .eq("id", v.id);
      if (e) throw e;
    },
    onSuccess: () => {
      setError(null);
      setMsg("Stock mis à jour.");
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      window.setTimeout(() => setMsg(null), 2000);
    },
    onError: (e: Error) => {
      setMsg(null);
      setError(e.message);
    },
  });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return products
      .map((p) => ({
        product: p,
        variants: p.product_variants.filter((v) => (lowOnly ? v.stock <= 3 : true)),
      }))
      .filter((r) => r.variants.length > 0 && (!s || r.product.name.toLowerCase().includes(s)));
  }, [products, q, lowOnly]);

  return (
    <div>
      <h1 className="font-display text-2xl leading-none">Inventaire</h1>
      <div className="mt-4 flex gap-2">
        <input
          className="field"
          placeholder="Rechercher un produit"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setLowOnly(!lowOnly)}
          className={lowOnly ? "chip chip-active shrink-0" : "chip shrink-0"}
        >
          Stock faible
        </button>
      </div>
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {msg && <p className="mt-3 text-xs text-accent">{msg}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-mut">Aucune variante trouvée.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map(({ product, variants }) => (
            <li key={product.id} className="rounded-2xl glass p-4">
              <p className="text-sm font-semibold uppercase">{product.name}</p>
              <ul className="mt-2 space-y-2">
                {variants.map((v) => (
                  <li key={v.id} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0">
                      {v.size} · {v.color_name}
                    </span>
                    <input
                      type="number"
                      min={0}
                      defaultValue={v.stock}
                      className="field w-24 py-1.5"
                      onBlur={(e) => {
                        const n = Number(e.target.value);
                        if (Number.isFinite(n) && n !== v.stock) setStock.mutate({ id: v.id, stock: n });
                      }}
                    />
                    {v.stock <= 3 && <span className="text-accent">faible</span>}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
