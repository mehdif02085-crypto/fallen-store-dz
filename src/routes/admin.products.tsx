import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Img } from "@/components/img";
import { storageRef } from "@/lib/image";
import { formatDA } from "@/lib/format";
import { allProductsAdminQuery, categoriesQuery, sortImages, type Product } from "@/lib/queries";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Draft = {
  id?: string;
  slug: string;
  name: string;
  subtitle: string;
  description_fr: string;
  description_ar: string;
  price_da: string;
  sale_price_da: string;
  category_id: string;
  is_active: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  is_featured: boolean;
};

const EMPTY: Draft = {
  slug: "",
  name: "",
  subtitle: "",
  description_fr: "",
  description_ar: "",
  price_da: "",
  sale_price_da: "",
  category_id: "",
  is_active: true,
  is_new: true,
  is_best_seller: false,
  is_featured: false,
};

function toDraft(p: Product): Draft {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    subtitle: p.subtitle ?? "",
    description_fr: p.description_fr ?? "",
    description_ar: p.description_ar ?? "",
    price_da: String(p.price_da),
    sale_price_da: p.sale_price_da == null ? "" : String(p.sale_price_da),
    category_id: p.category_id ?? "",
    is_active: p.is_active,
    is_new: p.is_new,
    is_best_seller: p.is_best_seller,
    is_featured: p.is_featured,
  };
}

function AdminProducts() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useQuery(allProductsAdminQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["products"] });
  }

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const price = Number(d.price_da);
      const sale = d.sale_price_da.trim() === "" ? null : Number(d.sale_price_da);
      if (!d.name.trim()) throw new Error("Le nom est obligatoire.");
      if (!Number.isFinite(price) || price < 0) throw new Error("Prix invalide.");
      if (sale != null && (!Number.isFinite(sale) || sale < 0 || sale >= price))
        throw new Error("Le prix soldé doit être inférieur au prix normal.");
      const slug =
        d.slug.trim() ||
        d.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      const payload = {
        slug,
        name: d.name.trim(),
        subtitle: d.subtitle.trim() || null,
        description_fr: d.description_fr.trim() || null,
        description_ar: d.description_ar.trim() || null,
        price_da: price,
        sale_price_da: sale,
        category_id: d.category_id || null,
        is_active: d.is_active,
        is_new: d.is_new,
        is_best_seller: d.is_best_seller,
        is_featured: d.is_featured,
      };

      if (d.id) {
        const { error: e } = await supabase.from("products").update(payload).eq("id", d.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("products").insert(payload);
        if (e) throw e;
      }
    },
    onSuccess: () => {
      setDraft(null);
      setError(null);
      refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("products").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: refresh,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl leading-none">Produits</h1>
        <button type="button" onClick={() => setDraft({ ...EMPTY })} className="btn-primary">
          <Plus className="size-4" /> Nouveau produit
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {draft && (
        <form
          className="mt-4 rounded-2xl glass p-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(draft);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nom">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="field"
                required
              />
            </Field>
            <Field label="Identifiant URL (optionnel)">
              <input
                value={draft.slug}
                onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                className="field"
                dir="ltr"
              />
            </Field>
            <Field label="Sous-titre">
              <input
                value={draft.subtitle}
                onChange={(e) => setDraft({ ...draft, subtitle: e.target.value })}
                className="field"
              />
            </Field>
            <Field label="Catégorie">
              <select
                value={draft.category_id}
                onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
                className="field"
              >
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_fr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prix (DA)">
              <input
                value={draft.price_da}
                onChange={(e) => setDraft({ ...draft, price_da: e.target.value })}
                inputMode="numeric"
                className="field"
                required
              />
            </Field>
            <Field label="Prix soldé (DA, vide si aucun)">
              <input
                value={draft.sale_price_da}
                onChange={(e) => setDraft({ ...draft, sale_price_da: e.target.value })}
                inputMode="numeric"
                className="field"
              />
            </Field>
            <Field label="Description (FR)">
              <textarea
                value={draft.description_fr}
                onChange={(e) => setDraft({ ...draft, description_fr: e.target.value })}
                rows={3}
                className="field"
              />
            </Field>
            <Field label="Description (AR)">
              <textarea
                value={draft.description_ar}
                onChange={(e) => setDraft({ ...draft, description_ar: e.target.value })}
                rows={3}
                className="field"
                dir="rtl"
              />
            </Field>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            {(
              [
                ["is_active", "En ligne"],
                ["is_new", "Nouveauté"],
                ["is_best_seller", "Meilleure vente"],
                ["is_featured", "Sélection"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })}
                  className="accent-accent"
                />
                {label}
              </label>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" onClick={() => setDraft(null)} className="btn-ghost">
              Annuler
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="mt-6 text-sm text-mut">Chargement…</p>}

      <ul className="mt-5 space-y-3">
        {products.map((p) => (
          <li key={p.id} className="rounded-2xl glass p-4">
            <div className="flex gap-3">
              <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-panel">
                <Img
                  src={sortImages(p)[0]?.url ?? null}
                  alt={p.name}
                  className="size-full object-cover"
                  width={160}
                  height={160}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold uppercase">{p.name}</p>
                <p className="mt-0.5 text-[11px] text-mut">
                  {formatDA(p.sale_price_da ?? p.price_da)} DA
                  {p.sale_price_da != null && ` (au lieu de ${formatDA(p.price_da)} DA)`} ·{" "}
                  {p.categories?.name_fr ?? "sans catégorie"} ·{" "}
                  {p.is_active ? "en ligne" : "masqué"}
                </p>
                <p className="mt-0.5 text-[11px] text-mut">
                  Stock total :{" "}
                  {(p.product_variants ?? []).reduce((s, v) => s + v.stock, 0)} ·{" "}
                  {(p.product_variants ?? []).length} variantes
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(toDraft(p))}
                    className="rounded-xl bg-ink/5 px-3 py-1.5 text-xs font-semibold"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Supprimer « ${p.name} » ?`)) remove.mutate(p.id);
                    }}
                    className="rounded-xl bg-ink/5 px-3 py-1.5 text-xs font-semibold text-danger"
                  >
                    <Trash2 className="inline size-3.5" /> Supprimer
                  </button>
                </div>
              </div>
            </div>

            <ImagesEditor product={p} onChange={refresh} />
            <VariantsEditor product={p} onChange={refresh} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function ImagesEditor({ product, onChange }: { product: Product; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const images = sortImages(product);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("Image trop lourde (10 Mo max).");
      return;
    }
    setBusy(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${product.id}/${crypto.randomUUID()}.${ext}`;
    const up = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type });
    if (up.error) {
      setBusy(false);
      setError(up.error.message);
      return;
    }
    const ref = storageRef("product-images", path);
    const { error: e } = await supabase.from("product_images").insert({
      product_id: product.id,
      url: ref,
      square_url: ref,
      alt: product.name,
      sort_order: images.length,
    });
    setBusy(false);
    if (e) setError(e.message);
    else onChange();
  }

  async function removeImage(id: string) {
    const { error: e } = await supabase.from("product_images").delete().eq("id", id);
    if (e) setError(e.message);
    else onChange();
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="label">Photos</p>
      <div className="flex flex-wrap items-center gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative size-16 overflow-hidden rounded-lg bg-panel">
            <Img
              src={img.url}
              alt={img.alt ?? product.name}
              className="size-full object-cover"
              width={128}
              height={128}
            />
            <button
              type="button"
              onClick={() => void removeImage(img.id)}
              aria-label="Supprimer la photo"
              className="absolute end-0 top-0 grid size-5 place-items-center rounded-bl-lg bg-canvas/80 text-danger"
            >
              ×
            </button>
          </div>
        ))}
        <label className="cursor-pointer rounded-xl bg-ink/5 px-3 py-2 text-xs font-semibold">
          <Upload className="inline size-3.5" /> {busy ? "Envoi…" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void upload(e.target.files?.[0])}
          />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-mut">
        Pour un rendu boutique : fond studio neutre, produit centré, éclairage régulier. Ne
        modifiez jamais le design imprimé.
      </p>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}

function VariantsEditor({ product, onChange }: { product: Product; onChange: () => void }) {
  const [size, setSize] = useState("");
  const [colorName, setColorName] = useState("Noir");
  const [colorHex, setColorHex] = useState("#0a0a0b");
  const [stock, setStock] = useState("10");
  const [error, setError] = useState<string | null>(null);

  async function addVariant() {
    setError(null);
    if (!size.trim() || !colorName.trim()) {
      setError("Taille et couleur obligatoires.");
      return;
    }
    const { error: e } = await supabase.from("product_variants").insert({
      product_id: product.id,
      size: size.trim().toUpperCase(),
      color_name: colorName.trim(),
      color_hex: colorHex,
      stock: Math.max(0, Number(stock) || 0),
    });
    if (e) setError(e.message);
    else {
      setSize("");
      onChange();
    }
  }

  async function setStockFor(id: string, value: number) {
    const { error: e } = await supabase
      .from("product_variants")
      .update({ stock: Math.max(0, value) })
      .eq("id", id);
    if (e) setError(e.message);
    else onChange();
  }

  async function removeVariant(id: string) {
    const { error: e } = await supabase.from("product_variants").delete().eq("id", id);
    if (e) setError(e.message);
    else onChange();
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="label">Tailles, couleurs et stock</p>
      <ul className="space-y-1.5">
        {(product.product_variants ?? []).map((v) => (
          <li key={v.id} className="flex items-center gap-2 text-xs">
            <span
              className="size-4 rounded-full ring-1 ring-line"
              style={{ backgroundColor: v.color_hex }}
            />
            <span className="w-24 truncate">{v.color_name}</span>
            <span className="w-10 font-semibold">{v.size}</span>
            <input
              type="number"
              min={0}
              defaultValue={v.stock}
              onBlur={(e) => void setStockFor(v.id, Number(e.target.value))}
              aria-label={`Stock ${v.size} ${v.color_name}`}
              className="field w-20 py-1"
            />
            <button
              type="button"
              onClick={() => void removeVariant(v.id)}
              className="text-danger"
              aria-label="Supprimer la variante"
            >
              <Trash2 className="size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <input
          value={size}
          onChange={(e) => setSize(e.target.value)}
          placeholder="Taille (M)"
          className="field w-24 py-1.5"
        />
        <input
          value={colorName}
          onChange={(e) => setColorName(e.target.value)}
          placeholder="Couleur"
          className="field w-28 py-1.5"
        />
        <input
          type="color"
          value={colorHex}
          onChange={(e) => setColorHex(e.target.value)}
          aria-label="Code couleur"
          className="h-9 w-12 rounded-lg bg-transparent"
        />
        <input
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          inputMode="numeric"
          className="field w-20 py-1.5"
          aria-label="Stock"
        />
        <button
          type="button"
          onClick={() => void addVariant()}
          className="rounded-xl bg-ink/5 px-3 py-2 text-xs font-semibold"
        >
          <Plus className="inline size-3.5" /> Ajouter
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  );
}
