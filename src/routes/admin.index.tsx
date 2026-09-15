import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDA } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminOrders,
});

const STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  preparing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const PAYMENT_LABEL: Record<string, string> = {
  unpaid: "Non payée",
  pending: "En attente",
  paid: "Payée",
  failed: "Échouée",
  refunded: "Remboursée",
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  phone: string;
  wilaya_name: string;
  city: string;
  address: string;
  clothing_size: string | null;
  delivery_notes: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal_da: number;
  delivery_fee_da: number;
  total_da: number;
  created_at: string;
  order_items: {
    id: string;
    product_name: string;
    size: string;
    color_name: string;
    quantity: number;
    unit_price_da: number;
    line_total_da: number;
    custom_design_id: string | null;
  }[];
};

function AdminOrders() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "*, order_items(id,product_name,size,color_name,quantity,unit_price_da,line_total_da,custom_design_id)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as OrderRow[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: next as OrderRow["status"] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });

  const updatePayment = useMutation({
    mutationFn: async ({ id, next }: { id: string; next: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: next as OrderRow["payment_status"] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "orders"] }),
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      if (!q) return true;
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.wilaya_name.toLowerCase().includes(q)
      );
    });
  }, [orders, status, search]);

  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.total_da, 0);

  return (
    <div>
      <h1 className="font-display text-3xl leading-none">Commandes</h1>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Commandes" value={String(orders.length)} />
        <Stat
          label="En attente"
          value={String(orders.filter((o) => o.status === "pending").length)}
        />
        <Stat
          label="Livrées"
          value={String(orders.filter((o) => o.status === "delivered").length)}
        />
        <Stat label="Total encaissable" value={`${formatDA(revenue)} DA`} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher n° commande, nom, téléphone, ville…"
          className="field flex-1"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field w-auto">
          <option value="all">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="mt-6 text-sm text-mut">Chargement…</p>}
      {!isLoading && visible.length === 0 && (
        <p className="mt-6 text-sm text-mut">Aucune commande pour ce filtre.</p>
      )}

      <ul className="mt-4 space-y-2">
        {visible.map((o) => (
          <li key={o.id} className="rounded-2xl glass p-4">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setOpenId(openId === o.id ? null : o.id)}
                className="text-start"
              >
                <p className="font-display text-lg leading-none" dir="ltr">
                  {o.order_number}
                </p>
                <p className="mt-1 text-[11px] text-mut">
                  {o.customer_name} · {o.phone} · {o.city}, {o.wilaya_name}
                </p>
              </button>
              <p className="ms-auto text-sm font-semibold">{formatDA(o.total_da)} DA</p>
              <select
                value={o.status}
                onChange={(e) => updateStatus.mutate({ id: o.id, next: e.target.value })}
                className="field w-auto text-xs"
                aria-label="Statut de la commande"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <select
                value={o.payment_status}
                onChange={(e) => updatePayment.mutate({ id: o.id, next: e.target.value })}
                className="field w-auto text-xs"
                aria-label="Statut du paiement"
              >
                {Object.keys(PAYMENT_LABEL).map((s) => (
                  <option key={s} value={s}>
                    {PAYMENT_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>

            {openId === o.id && (
              <div className="mt-3 border-t border-line pt-3 text-xs text-mut">
                <p className="text-ink">{o.address}</p>
                <p className="mt-1">
                  Taille client : {o.clothing_size ?? "—"} · Paiement :{" "}
                  {o.payment_method.toUpperCase()} ·{" "}
                  {new Date(o.created_at).toLocaleString("fr-DZ")}
                </p>
                {o.delivery_notes && <p className="mt-1">Notes : {o.delivery_notes}</p>}
                <ul className="mt-2 space-y-1">
                  {o.order_items.map((it) => (
                    <li key={it.id} className="flex justify-between gap-2">
                      <span className="text-ink">
                        {it.product_name} — {it.size} / {it.color_name} ×{it.quantity}
                        {it.custom_design_id ? " · personnalisé" : ""}
                      </span>
                      <span>{formatDA(it.line_total_da)} DA</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2">
                  Sous-total {formatDA(o.subtotal_da)} DA · Livraison{" "}
                  {formatDA(o.delivery_fee_da)} DA
                </p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl glass p-3">
      <p className="text-[10px] uppercase tracking-widest text-mut">{label}</p>
      <p className="mt-1 font-display text-xl leading-none">{value}</p>
    </div>
  );
}
