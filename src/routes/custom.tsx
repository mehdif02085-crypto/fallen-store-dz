import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Upload } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CustomSpec } from "@/lib/cart";
import { useI18n, type TKey } from "@/lib/i18n";
import { formatDA } from "@/lib/format";
import { customSettingsQuery } from "@/lib/queries";

export const Route = createFileRoute("/custom")({
  head: () => ({
    meta: [
      { title: "Shirt personnalisé — ton design imprimé | Fallen Store" },
      {
        name: "description",
        content:
          "Crée ton t-shirt Fallen Store : modèle, couleur, taille, ton image, ton texte et la position du design. Aperçu avant commande, prix en DA.",
      },
      {
        property: "og:title",
        content: "Shirt personnalisé — ton design imprimé | Fallen Store",
      },
      {
        property: "og:description",
        content: "Upload ton visuel, ajoute ton texte, visualise puis commande.",
      },
    ],
  }),
  component: CustomShirt,
});

const MODELS = ["Heavyweight Tee", "Oversized Tee", "Boxy Hoodie", "Crewneck Sweat"] as const;
const SHIRT_COLORS = [
  { name: "Noir", hex: "#0a0a0b" },
  { name: "Os", hex: "#d6d3ca" },
  { name: "Stone", hex: "#8a8a7f" },
  { name: "Blanc", hex: "#f4f4f5" },
] as const;
const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const TEXT_COLORS = ["#f4f4f5", "#0a0a0b", "#ff5a2c", "#c9c2b1"] as const;
const POSITIONS: { value: string; key: TKey }[] = [
  { value: "center", key: "pos.center" },
  { value: "left", key: "pos.left" },
  { value: "right", key: "pos.right" },
  { value: "back", key: "pos.back" },
];

function CustomShirt() {
  const { t } = useI18n();
  const { add } = useCart();
  const { data: settings } = useQuery(customSettingsQuery);

  const [model, setModel] = useState<string>(MODELS[0]);
  const [color, setColor] = useState(SHIRT_COLORS[0]);
  const [size, setSize] = useState<string>("M");
  const [text, setText] = useState("");
  const [textColor, setTextColor] = useState<string>(TEXT_COLORS[0]);
  const [position, setPosition] = useState("center");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [storagePath, setStoragePath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const base = settings?.base_price_da ?? 4500;
  const price =
    base +
    (storagePath ? (settings?.image_print_surcharge_da ?? 0) : 0) +
    (text.trim() ? (settings?.text_print_surcharge_da ?? 0) : 0);

  async function onUpload(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("custom.uploadHint"));
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setUploadError(t("custom.uploadHint"));
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("custom-designs").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    setUploading(false);
    if (error) {
      setUploadError(error.message);
      return;
    }
    setStoragePath(path);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function addToCart() {
    const spec: CustomSpec = {
      shirt_model: model,
      shirt_color_name: color.name,
      shirt_color_hex: color.hex,
      size,
      design_image_url: storagePath,
      custom_text: text.trim() ? text.trim().slice(0, 60) : null,
      text_color: text.trim() ? textColor : null,
      position,
    };
    add({
      kind: "custom",
      name: `Custom Shirt — ${model}`,
      unitPrice: price,
      quantity: 1,
      size,
      colorName: color.name,
      image: previewUrl,
      custom: spec,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  const disabled = settings ? !settings.is_enabled : false;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-5 pt-6">
        <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
          {t("custom.badge")}
        </span>
        <h1 className="mt-3 font-display text-4xl leading-[0.9]">{t("custom.title")}</h1>
        <p className="mt-2 max-w-[42ch] text-sm text-mut">{t("custom.text")}</p>

        {disabled ? (
          <div className="mt-6 rounded-2xl glass p-5 text-sm text-mut">
            {t("custom.disabled")}
            <Link to="/shop" className="btn-primary mt-4">
              {t("nav.shop")}
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
            {/* PREVIEW */}
            <div className="order-first md:order-last">
              <p className="label">{t("custom.preview")}</p>
              <div
                className="relative aspect-square w-full overflow-hidden rounded-2xl glass"
                style={{ backgroundColor: color.hex }}
              >
                {/* shirt silhouette */}
                <div className="absolute inset-x-[12%] top-[8%] bottom-[6%] rounded-[28px] opacity-20 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]" />
                <div
                  className={`absolute flex flex-col items-center gap-2 ${
                    position === "center"
                      ? "inset-x-[28%] top-[32%]"
                      : position === "left"
                        ? "start-[22%] top-[26%] w-[22%]"
                        : position === "right"
                          ? "end-[22%] top-[26%] w-[22%]"
                          : "inset-x-[26%] top-[26%]"
                  }`}
                >
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt={t("custom.preview")}
                      className="w-full rounded object-contain"
                    />
                  )}
                  {text.trim() && (
                    <span
                      className="font-display text-center text-lg leading-none"
                      style={{ color: textColor }}
                    >
                      {text.trim().slice(0, 60)}
                    </span>
                  )}
                </div>
                {position === "back" && (
                  <span className="absolute bottom-2 start-2 rounded-full bg-canvas/70 px-2 py-0.5 text-[10px] text-ink">
                    {t("pos.back")}
                  </span>
                )}
              </div>

              <div className="mt-4 rounded-2xl glass p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-mut">{t("cart.total")}</span>
                  <span className="text-lg font-semibold">
                    {formatDA(price)} <span className="text-xs text-mut">DA</span>
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-mut">{t("custom.priceNote")}</p>
                <button type="button" onClick={addToCart} className="btn-primary mt-4 w-full">
                  {added ? (
                    <>
                      <Check className="size-4" /> {t("product.added")}
                    </>
                  ) : (
                    t("custom.add")
                  )}
                </button>
                {added && (
                  <Link to="/cart" className="btn-ghost mt-2 w-full">
                    {t("cart.title")}
                  </Link>
                )}
              </div>
            </div>

            {/* CONFIGURATOR */}
            <div className="space-y-5">
              <div>
                <p className="label">{t("custom.model")}</p>
                <div className="flex flex-wrap gap-2">
                  {MODELS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
                        model === m ? "bg-accent text-accent-foreground" : "bg-ink/5"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">{t("custom.color")}</p>
                <div className="flex gap-2">
                  {SHIRT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      aria-label={c.name}
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c.hex }}
                      className={`size-8 rounded-full ${
                        color.name === c.name
                          ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas"
                          : "ring-1 ring-line"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="label">{t("custom.size")}</p>
                <div className="flex flex-wrap gap-2">
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSize(s)}
                      className={`chip ${size === s ? "chip-active" : ""}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">{t("custom.upload")}</p>
                <label className="btn-ghost w-full cursor-pointer">
                  <Upload className="size-4" />
                  {uploading ? t("custom.uploading") : t("custom.upload")}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => void onUpload(e.target.files?.[0])}
                  />
                </label>
                <p className="mt-1 text-[11px] text-mut">{t("custom.uploadHint")}</p>
                {uploadError && <p className="mt-1 text-[11px] text-danger">{uploadError}</p>}
              </div>

              <div>
                <p className="label">{t("custom.text_label")}</p>
                <input
                  value={text}
                  maxLength={60}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="FALLEN"
                  className="field"
                />
              </div>

              <div>
                <p className="label">{t("custom.textColor")}</p>
                <div className="flex gap-2">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={c}
                      onClick={() => setTextColor(c)}
                      style={{ backgroundColor: c }}
                      className={`size-8 rounded-full ${
                        textColor === c
                          ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas"
                          : "ring-1 ring-line"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className="label">{t("custom.position")}</p>
                <div className="flex flex-wrap gap-2">
                  {POSITIONS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPosition(p.value)}
                      className={`rounded-full px-3.5 py-2 text-xs font-semibold ${
                        position === p.value ? "bg-accent text-accent-foreground" : "bg-ink/5"
                      }`}
                    >
                      {t(p.key)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
