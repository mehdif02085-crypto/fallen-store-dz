import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  categoriesQuery,
  customSettingsQuery,
  deliverySettingsQuery,
  paymentMethodsQuery,
  wilayasQuery,
} from "@/lib/queries";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const queryClient = useQueryClient();
  const { data: delivery } = useQuery(deliverySettingsQuery);
  const { data: wilayas = [] } = useQuery(wilayasQuery);
  const { data: methods = [] } = useQuery(paymentMethodsQuery);
  const { data: custom } = useQuery(customSettingsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wilayaSearch, setWilayaSearch] = useState("");

  function done(key: string) {
    setError(null);
    setMsg("Enregistré.");
    void queryClient.invalidateQueries({ queryKey: [key] });
    window.setTimeout(() => setMsg(null), 2000);
  }

  const saveDelivery = useMutation({
    mutationFn: async (v: { default_fee_da: number; free_shipping_threshold_da: number | null }) => {
      const { error: e } = await supabase.from("delivery_settings").update(v).eq("id", true);
      if (e) throw e;
    },
    onSuccess: () => done("delivery_settings"),
    onError: (e: Error) => setError(e.message),
  });

  const saveWilaya = useMutation({
    mutationFn: async (v: { code: number; fee: number }) => {
      const { error: e } = await supabase
        .from("wilayas")
        .update({ delivery_fee_da: Math.max(0, v.fee) })
        .eq("code", v.code);
      if (e) throw e;
    },
    onSuccess: () => done("wilayas"),
    onError: (e: Error) => setError(e.message),
  });

  const togglePayment = useMutation({
    mutationFn: async (v: { code: string; enabled: boolean }) => {
      const { error: e } = await supabase
        .from("payment_methods")
        .update({ is_enabled: v.enabled })
        .eq("code", v.code);
      if (e) throw e;
    },
    onSuccess: () => done("payment_methods"),
    onError: (e: Error) => setError(e.message),
  });

  const saveCustom = useMutation({
    mutationFn: async (v: {
      base_price_da: number;
      image_print_surcharge_da: number;
      text_print_surcharge_da: number;
      is_enabled: boolean;
    }) => {
      const { error: e } = await supabase.from("custom_shirt_settings").update(v).eq("id", true);
      if (e) throw e;
    },
    onSuccess: () => done("custom_shirt_settings"),
    onError: (e: Error) => setError(e.message),
  });

  const saveCategory = useMutation({
    mutationFn: async (v: { id: string; is_active: boolean }) => {
      const { error: e } = await supabase
        .from("categories")
        .update({ is_active: v.is_active })
        .eq("id", v.id);
      if (e) throw e;
    },
    onSuccess: () => done("categories"),
    onError: (e: Error) => setError(e.message),
  });

  const filteredWilayas = wilayas.filter((w) =>
    w.name_fr.toLowerCase().includes(wilayaSearch.trim().toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl leading-none">Réglages</h1>
      {msg && <p className="text-xs text-accent">{msg}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}

      {/* DELIVERY */}
      <section className="rounded-2xl glass p-4">
        <h2 className="font-display text-xl leading-none">Livraison</h2>
        {delivery && (
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              saveDelivery.mutate({
                default_fee_da: Number(form.get("fee")) || 0,
                free_shipping_threshold_da:
                  String(form.get("threshold")).trim() === ""
                    ? null
                    : Number(form.get("threshold")),
              });
            }}
          >
            <label className="block">
              <span className="label">Frais par défaut (DA)</span>
              <input
                name="fee"
                defaultValue={delivery.default_fee_da}
                inputMode="numeric"
                className="field w-32"
              />
            </label>
            <label className="block">
              <span className="label">Livraison offerte à partir de (DA)</span>
              <input
                name="threshold"
                defaultValue={delivery.free_shipping_threshold_da ?? ""}
                inputMode="numeric"
                className="field w-40"
              />
            </label>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </form>
        )}

        <p className="label mt-5">Frais par wilaya</p>
        <input
          value={wilayaSearch}
          onChange={(e) => setWilayaSearch(e.target.value)}
          placeholder="Rechercher une wilaya…"
          className="field"
        />
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {filteredWilayas.map((w) => (
            <li key={w.code} className="flex items-center gap-2 text-xs">
              <span className="w-8 text-mut">{String(w.code).padStart(2, "0")}</span>
              <span className="flex-1 truncate">{w.name_fr}</span>
              <input
                type="number"
                min={0}
                defaultValue={w.delivery_fee_da}
                onBlur={(e) =>
                  saveWilaya.mutate({ code: w.code, fee: Number(e.target.value) || 0 })
                }
                aria-label={`Frais ${w.name_fr}`}
                className="field w-24 py-1"
              />
            </li>
          ))}
        </ul>
      </section>

      {/* PAYMENTS */}
      <section className="rounded-2xl glass p-4">
        <h2 className="font-display text-xl leading-none">Moyens de paiement</h2>
        <p className="mt-1 text-xs text-mut">
          Les paiements en ligne (CIB, Edahabia, carte) nécessitent les identifiants du
          fournisseur côté serveur. Tant qu'ils ne sont pas configurés, ils restent affichés
          comme indisponibles pour les clients.
        </p>
        <ul className="mt-3 space-y-2">
          {methods.map((m) => (
            <li key={m.code} className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={m.is_enabled}
                onChange={(e) =>
                  togglePayment.mutate({ code: m.code, enabled: e.target.checked })
                }
                className="mt-1 accent-accent"
                aria-label={m.name_fr}
              />
              <span>
                <span className="block font-semibold">{m.name_fr}</span>
                <span className="text-[11px] text-mut">
                  {m.description_fr}
                  {m.requires_credentials && " · identifiants requis"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* CUSTOM SHIRT */}
      <section className="rounded-2xl glass p-4">
        <h2 className="font-display text-xl leading-none">Shirt personnalisé</h2>
        {custom && (
          <form
            className="mt-3 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              saveCustom.mutate({
                base_price_da: Number(form.get("base")) || 0,
                image_print_surcharge_da: Number(form.get("image")) || 0,
                text_print_surcharge_da: Number(form.get("text")) || 0,
                is_enabled: form.get("enabled") === "on",
              });
            }}
          >
            <label className="block">
              <span className="label">Prix de base (DA)</span>
              <input
                name="base"
                defaultValue={custom.base_price_da}
                inputMode="numeric"
                className="field w-32"
              />
            </label>
            <label className="block">
              <span className="label">Supplément image (DA)</span>
              <input
                name="image"
                defaultValue={custom.image_print_surcharge_da}
                inputMode="numeric"
                className="field w-32"
              />
            </label>
            <label className="block">
              <span className="label">Supplément texte (DA)</span>
              <input
                name="text"
                defaultValue={custom.text_print_surcharge_da}
                inputMode="numeric"
                className="field w-32"
              />
            </label>
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                name="enabled"
                defaultChecked={custom.is_enabled}
                className="accent-accent"
              />
              Service activé
            </label>
            <button type="submit" className="btn-primary">
              Enregistrer
            </button>
          </form>
        )}
      </section>

      {/* CATEGORIES */}
      <section className="rounded-2xl glass p-4">
        <h2 className="font-display text-xl leading-none">Catégories</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={c.is_active}
                onChange={(e) => saveCategory.mutate({ id: c.id, is_active: e.target.checked })}
                className="accent-accent"
                aria-label={c.name_fr}
              />
              <span className="flex-1">
                {c.name_fr} <span className="text-mut">· {c.name_ar}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
