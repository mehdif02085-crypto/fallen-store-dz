import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Check,
  ImagePlus,
  Loader2,
  RotateCw,
  Trash2,
  Type,
  Undo2,
  Maximize2,
  Copy,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPE } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CustomSpec } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { formatDA } from "@/lib/format";
import { customSettingsQuery } from "@/lib/queries";
import {
  EXAMPLES,
  FONTS,
  INK_COLORS,
  MODELS,
  SHIRT_COLORS,
  canvasBlob,
  fontCss,
  rasterize,
  renderSide,
  toLayout,
  uid,
  type Design,
  type El,
  type Side,
} from "@/lib/designer";

export const Route = createFileRoute("/custom")({
  head: () => ({
    meta: [
      { title: "Studio de personnalisation — crée ton shirt | Fallen Store" },
      {
        name: "description",
        content:
          "Designer en direct : choisis ton modèle, ta couleur, ajoute textes et images devant et dos, déplace, redimensionne, pivote. Prix en DA.",
      },
      { property: "og:title", content: "Studio de personnalisation | Fallen Store" },
      {
        property: "og:description",
        content: "Crée ton t-shirt, hoodie ou sweat avec un aperçu en temps réel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomShirt,
});

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

function CustomShirt() {
  const { t, lang } = useI18n();
  const L = (fr: string, ar: string) => (lang === "ar" ? ar : fr);
  const { add } = useCart();
  const { data: settings } = useQuery(customSettingsQuery);

  const [design, setDesign] = useState<Design>(() => ({
    model: "oversized",
    color: SHIRT_COLORS[0],
    els: [],
  }));
  const [history, setHistory] = useState<Design[]>([]);
  const lastPush = useRef(0);
  const [side, setSide] = useState<Side>("front");
  const [size, setSize] = useState("M");
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [added, setAdded] = useState(false);

  const model = MODELS.find((m) => m.id === design.model) ?? MODELS[0]!;
  const area = model.area[side];
  const sideEls = design.els.filter((e) => e.side === side);
  const sel = design.els.find((e) => e.id === selected) ?? null;

  const hasImage = design.els.some((e) => e.kind === "image");
  const texts = design.els.filter((e) => e.kind === "text" && e.text?.trim());
  const base = settings?.base_price_da ?? 4500;
  const price =
    base +
    (hasImage ? (settings?.image_print_surcharge_da ?? 0) : 0) +
    (texts.length ? (settings?.text_print_surcharge_da ?? 0) : 0);

  /** Save a history snapshot (coalesced for continuous changes). */
  const snapshot = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastPush.current < 500) return;
      lastPush.current = now;
      setHistory((h) => [...h.slice(-49), design]);
    },
    [design],
  );

  function update(fn: (d: Design) => Design, force = true) {
    snapshot(force);
    setDesign(fn);
  }
  const patchEl = (id: string, p: Partial<El>, force = false) =>
    update((d) => ({ ...d, els: d.els.map((e) => (e.id === id ? { ...e, ...p } : e)) }), force);

  function undo() {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (prev) setDesign(prev);
      return h.slice(0, -1);
    });
  }

  function removeEl(id: string) {
    update((d) => ({ ...d, els: d.els.filter((e) => e.id !== id) }));
    setSelected(null);
  }

  function duplicate(el: El) {
    const id = uid();
    update((d) => ({ ...d, els: [...d.els, { ...el, id, x: Math.min(0.9, el.x + 0.06), y: Math.min(0.9, el.y + 0.06) }] }));
    setSelected(id);
  }

  function addText() {
    const id = uid();
    const ink = design.color.hex === "#f5f5f4" || design.color.name === "Os" ? "#111113" : "#ffffff";
    update((d) => ({
      ...d,
      els: [...d.els, { id, kind: "text", side, x: 0.5, y: 0.35, w: 0.14, rot: 0, text: "FALLEN", font: "display", color: ink }],
    }));
    setSelected(id);
  }

  async function uploadBlob(blob: Blob, ext: string) {
    const { data: sess } = await supabase.auth.getSession();
    const folder = sess.session?.user.id ?? "guest";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("custom-designs")
      .upload(path, blob, { contentType: blob.type, upsert: false });
    if (error) throw error;
    return path;
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    setUploadError(null);
    for (const file of Array.from(files).slice(0, 5)) {
      if (file.size > 10 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setUploadError(t("custom.uploadHint"));
        continue;
      }
      const src = URL.createObjectURL(file);
      const id = uid();
      const img = new Image();
      img.onload = () => {
        const aspect = img.naturalHeight / img.naturalWidth || 1;
        update((d) => ({
          ...d,
          els: [...d.els, { id, kind: "image", side, x: 0.5, y: 0.4, w: aspect > 1.3 ? 0.45 : 0.6, rot: 0, src, aspect, path: null }],
        }));
        setSelected(id);
      };
      img.src = src;
      const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
      setUploading((n) => n + 1);
      uploadBlob(file, ext)
        .then((path) =>
          setDesign((d) => ({ ...d, els: d.els.map((e) => (e.id === id ? { ...e, path } : e)) })),
        )
        .catch((e: Error) => setUploadError(e.message))
        .finally(() => setUploading((n) => n - 1));
    }
  }

  function loadExample(i: number) {
    const ex = EXAMPLES[i]!;
    update(() => ex.design());
    const d = ex.design();
    setSide(d.els.some((e) => e.side === "front") ? "front" : "back");
    setSelected(null);
  }

  async function addToCart() {
    setSaving(true);
    setUploadError(null);
    try {
      // make sure every image (incl. example graphics) is stored for printing
      const els: El[] = [];
      for (const e of design.els) {
        if (e.kind === "image" && !e.path && e.src) {
          const path = await uploadBlob(await rasterize(e.src), "png");
          els.push({ ...e, path });
        } else els.push(e);
      }
      const final: Design = { ...design, els };
      setDesign(final);
      const front = await renderSide(final, "front");
      const back = await renderSide(final, "back");
      const frontPath = await uploadBlob(await canvasBlob(front), "jpg");
      const backPath = final.els.some((e) => e.side === "back")
        ? await uploadBlob(await canvasBlob(back), "jpg")
        : null;
      const thumb = document.createElement("canvas");
      thumb.width = thumb.height = 240;
      thumb.getContext("2d")!.drawImage(front, 0, 0, 240, 240);

      const firstImg = els.find((e) => e.kind === "image")?.path ?? null;
      const textSummary = texts.map((e) => e.text!.trim()).join(" / ").slice(0, 60);
      const spec: CustomSpec = {
        shirt_model: model.name,
        shirt_color_name: final.color.name,
        shirt_color_hex: final.color.hex,
        size,
        design_image_url: firstImg,
        custom_text: textSummary || null,
        text_color: texts[0]?.color ?? null,
        position: final.els.some((e) => e.side === "back")
          ? final.els.some((e) => e.side === "front")
            ? "front+back"
            : "back"
          : "front",
        layout: toLayout(final) as unknown as NonNullable<CustomSpec["layout"]>,
        preview_front_url: frontPath,
        preview_back_url: backPath,
      };
      add({
        kind: "custom",
        name: `Custom — ${model.name}`,
        unitPrice: price,
        quantity: 1,
        size,
        colorName: final.color.name,
        image: thumb.toDataURL("image/jpeg", 0.8),
        custom: spec,
      });
      setAdded(true);
      window.setTimeout(() => setAdded(false), 3000);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  // keyboard: delete / undo
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) removeEl(selected);
      if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ---------- direct manipulation ---------- */
  const areaRef = useRef<HTMLDivElement>(null);

  function startDrag(e: RPE, el: El, mode: "move" | "resize" | "rotate") {
    e.stopPropagation();
    e.preventDefault();
    setSelected(el.id);
    snapshot(true);
    const box = areaRef.current!.getBoundingClientRect();
    const cx = box.left + el.x * box.width;
    const cy = box.top + el.y * box.height;
    const sx = e.clientX;
    const sy = e.clientY;
    const startDist = Math.hypot(sx - cx, sy - cy) || 1;
    const startAng = Math.atan2(sy - cy, sx - cx);
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      let p: Partial<El>;
      if (mode === "move") {
        p = {
          x: Math.min(1.1, Math.max(-0.1, el.x + (ev.clientX - sx) / box.width)),
          y: Math.min(1.1, Math.max(-0.1, el.y + (ev.clientY - sy) / box.height)),
        };
      } else if (mode === "resize") {
        const r = Math.hypot(ev.clientX - cx, ev.clientY - cy) / startDist;
        p = { w: Math.min(el.kind === "text" ? 0.6 : 1.4, Math.max(0.03, el.w * r)) };
      } else {
        const a = Math.atan2(ev.clientY - cy, ev.clientX - cx);
        let deg = el.rot + ((a - startAng) * 180) / Math.PI;
        deg = ((deg + 540) % 360) - 180;
        if (Math.abs(deg) < 3) deg = 0;
        p = { rot: Math.round(deg) };
      }
      setDesign((d) => ({ ...d, els: d.els.map((x) => (x.id === el.id ? { ...x, ...p } : x)) }));
    };
    const up = () => {
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
      target.removeEventListener("pointercancel", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
    target.addEventListener("pointercancel", up);
  }

  const disabled = settings ? !settings.is_enabled : false;
  const pill = (on: boolean) =>
    `rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${on ? "bg-accent text-accent-foreground" : "bg-ink/5 hover:bg-ink/10"}`;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-5">
        <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
          {t("custom.badge")}
        </span>
        <h1 className="mt-3 font-display text-4xl leading-[0.9] sm:text-5xl">{t("custom.title")}</h1>
        <p className="mt-2 max-w-[52ch] text-sm text-mut">
          {L(
            "Glisse, redimensionne et pivote tes textes et images directement sur le vêtement. Devant et dos, aperçu en direct.",
            "اسحب وكبّر وأدر النصوص والصور مباشرة على الملابس. الأمام والخلف، معاينة فورية.",
          )}
        </p>

        {disabled ? (
          <div className="mt-6 rounded-2xl glass p-5 text-sm text-mut">
            {t("custom.disabled")}
            <Link to="/shop" className="btn-primary mt-4">
              {t("nav.shop")}
            </Link>
          </div>
        ) : (
          <>
            {/* MODELS */}
            <section className="mt-7" aria-label={t("custom.model")}>
              <p className="label">{t("custom.model")}</p>
              <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-5 sm:px-0">
                {MODELS.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => update((d) => ({ ...d, model: m.id }))}
                    aria-pressed={design.model === m.id}
                    className={`w-40 shrink-0 snap-start rounded-xl p-2 text-start transition-colors sm:w-auto ${design.model === m.id ? "bg-accent/15 ring-2 ring-accent" : "bg-panel hover:bg-ink/5"}`}
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {(["front", "back"] as const).map((s) => (
                        <Garment key={s} src={m.img[s]} color={design.color.hex} className="aspect-square" />
                      ))}
                    </div>
                    <p className="mt-1.5 truncate text-xs font-semibold">{m.name}</p>
                    <p className="text-[10px] text-mut">{L("Devant · Dos", "أمام · خلف")}</p>
                  </button>
                ))}
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              {/* STAGE */}
              <div className="lg:sticky lg:top-20 lg:self-start">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex rounded-full bg-ink/5 p-1" role="tablist">
                    {(["front", "back"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="tab"
                        aria-selected={side === s}
                        onClick={() => {
                          setSide(s);
                          setSelected(null);
                        }}
                        className={`min-h-9 rounded-full px-4 text-xs font-semibold ${side === s ? "bg-ink text-canvas" : "text-mut"}`}
                      >
                        {s === "front" ? L("Devant", "الأمام") : L("Dos", "الخلف")}
                        <span className="ms-1 opacity-60">({design.els.filter((e) => e.side === s).length})</span>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={undo}
                    disabled={history.length === 0}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-ink/5 px-3 text-xs font-semibold disabled:opacity-40"
                  >
                    <Undo2 className="size-4" /> {L("Annuler", "تراجع")}
                  </button>
                </div>

                <div
                  className="relative mt-3 aspect-square w-full touch-none select-none overflow-hidden rounded-2xl bg-panel"
                  onPointerDown={() => setSelected(null)}
                  data-testid="stage"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,var(--color-ink)_0%,transparent_70%)] opacity-[0.06]" />
                  <Garment src={model.img[side]} color={design.color.hex} className="absolute inset-0" />
                  <div
                    ref={areaRef}
                    className="absolute"
                    style={{
                      left: `${area.l}%`,
                      top: `${area.t}%`,
                      width: `${area.w}%`,
                      height: `${area.h}%`,
                      containerType: "inline-size",
                    }}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 rounded border border-dashed transition-opacity ${selected || sideEls.length === 0 ? "border-accent/60 opacity-100" : "opacity-0"}`}
                    />
                    {sideEls.map((el) => {
                      const isSel = el.id === selected;
                      return (
                        <div
                          key={el.id}
                          data-el={el.kind}
                          onPointerDown={(e) => startDrag(e, el, "move")}
                          className="absolute cursor-move"
                          style={{
                            left: `${el.x * 100}%`,
                            top: `${el.y * 100}%`,
                            width: el.kind === "image" ? `${el.w * 100}%` : undefined,
                            transform: `translate(-50%, -50%) rotate(${el.rot}deg)`,
                          }}
                        >
                          {el.kind === "image" ? (
                            <img src={el.src} alt="" draggable={false} className="block w-full" style={{ aspectRatio: `1 / ${el.aspect ?? 1}` }} />
                          ) : (
                            <span
                              className="block whitespace-nowrap leading-none"
                              style={{
                                fontFamily: fontCss(el.font ?? "display"),
                                fontWeight: el.font === "display" ? 400 : 700,
                                fontSize: `${el.w * 100}cqw`,
                                color: el.color,
                              }}
                            >
                              {el.text || " "}
                            </span>
                          )}
                          {isSel && (
                            <>
                              <span className="pointer-events-none absolute -inset-1 rounded-sm ring-2 ring-accent" />
                              <button
                                type="button"
                                aria-label={L("Pivoter", "تدوير")}
                                onPointerDown={(e) => startDrag(e, el, "rotate")}
                                className="absolute -top-9 left-1/2 grid size-7 -translate-x-1/2 cursor-grab place-items-center rounded-full bg-accent text-accent-foreground shadow"
                              >
                                <RotateCw className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                aria-label={L("Redimensionner", "تغيير الحجم")}
                                onPointerDown={(e) => startDrag(e, el, "resize")}
                                className="absolute -bottom-4 -right-4 grid size-7 cursor-nwse-resize place-items-center rounded-full bg-accent text-accent-foreground shadow"
                              >
                                <Maximize2 className="size-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="absolute bottom-2 start-2 rounded-full bg-canvas/70 px-2 py-0.5 text-[10px] text-ink">
                    {model.name} · {design.color.name} · {side === "front" ? L("Devant", "الأمام") : L("Dos", "الخلف")}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-mut">
                  {L(
                    "Touche un élément pour le sélectionner, glisse pour le déplacer, utilise les poignées pour pivoter et redimensionner.",
                    "المس عنصرا لتحديده، اسحبه لتحريكه، واستعمل المقابض للتدوير وتغيير الحجم.",
                  )}
                </p>
              </div>

              {/* CONTROLS */}
              <div className="space-y-5">
                <div>
                  <p className="label">{t("custom.color")}</p>
                  <div className="flex flex-wrap gap-2.5">
                    {SHIRT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        aria-label={c.name}
                        title={c.name}
                        onClick={() => update((d) => ({ ...d, color: c }))}
                        style={{ backgroundColor: c.hex }}
                        className={`size-9 rounded-full ${design.color.name === c.name ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : "ring-1 ring-line"}`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label">{t("custom.size")}</p>
                  <div className="flex flex-wrap gap-2">
                    {SIZES.map((s) => (
                      <button key={s} type="button" onClick={() => setSize(s)} className={`chip ${size === s ? "chip-active" : ""}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={addText} className="btn-ghost w-full">
                    <Type className="size-4" /> {L("Ajouter texte", "إضافة نص")}
                  </button>
                  <label className="btn-ghost w-full cursor-pointer">
                    {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
                    {L("Ajouter image", "إضافة صورة")}
                    <input
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        onFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <p className="-mt-3 text-[11px] text-mut">
                  {t("custom.uploadHint")} {L("Ajouté sur la vue", "يُضاف إلى")} {side === "front" ? L("devant", "الأمام") : L("dos", "الخلف")}.
                </p>
                {uploadError && <p className="text-[11px] text-danger">{uploadError}</p>}

                {/* LAYERS */}
                {sideEls.length > 0 && (
                  <div>
                    <p className="label">{L("Éléments", "العناصر")}</p>
                    <ul className="space-y-1.5">
                      {sideEls.map((el) => (
                        <li key={el.id}>
                          <div className={`flex items-center gap-2 rounded-xl px-2 py-1.5 ${el.id === selected ? "bg-accent/15 ring-1 ring-accent" : "bg-ink/5"}`}>
                            <button type="button" onClick={() => setSelected(el.id)} className="flex min-h-8 min-w-0 flex-1 items-center gap-2 text-start text-xs">
                              {el.kind === "image" ? (
                                <img src={el.src} alt="" className="size-7 rounded object-contain" />
                              ) : (
                                <Type className="size-4 shrink-0" />
                              )}
                              <span className="truncate">{el.kind === "text" ? el.text || "—" : L("Image", "صورة")}</span>
                              {el.kind === "image" && !el.path && el.src?.startsWith("blob:") && (
                                <Loader2 className="size-3 animate-spin text-mut" />
                              )}
                            </button>
                            <button type="button" aria-label={L("Dupliquer", "نسخ")} onClick={() => duplicate(el)} className="grid size-8 place-items-center rounded-full hover:bg-ink/10">
                              <Copy className="size-3.5" />
                            </button>
                            <button type="button" aria-label={L("Supprimer", "حذف")} onClick={() => removeEl(el.id)} className="grid size-8 place-items-center rounded-full text-danger hover:bg-ink/10">
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* SELECTED ELEMENT EDITOR */}
                {sel && sel.side === side && (
                  <div className="space-y-3 rounded-2xl glass p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider">
                      {sel.kind === "text" ? L("Texte sélectionné", "النص المحدد") : L("Image sélectionnée", "الصورة المحددة")}
                    </p>
                    {sel.kind === "text" && (
                      <>
                        <input
                          value={sel.text ?? ""}
                          maxLength={40}
                          onChange={(e) => patchEl(sel.id, { text: e.target.value })}
                          className="field"
                          aria-label={t("custom.text_label")}
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {FONTS.map((f) => (
                            <button key={f.id} type="button" onClick={() => patchEl(sel.id, { font: f.id }, true)} className={pill(sel.font === f.id)} style={{ fontFamily: f.css }}>
                              {f.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {INK_COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              aria-label={c}
                              onClick={() => patchEl(sel.id, { color: c }, true)}
                              style={{ backgroundColor: c }}
                              className={`size-7 rounded-full ${sel.color === c ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas" : "ring-1 ring-line"}`}
                            />
                          ))}
                          <input
                            type="color"
                            value={sel.color ?? "#ffffff"}
                            onChange={(e) => patchEl(sel.id, { color: e.target.value })}
                            className="size-7 cursor-pointer rounded-full border-0 bg-transparent p-0"
                            aria-label={t("custom.textColor")}
                          />
                        </div>
                      </>
                    )}
                    <Slider label={L("Taille", "الحجم")} min={3} max={sel.kind === "text" ? 60 : 140} value={Math.round(sel.w * 100)} onChange={(v) => patchEl(sel.id, { w: v / 100 })} />
                    <Slider label={L("Rotation", "التدوير")} min={-180} max={180} value={sel.rot} suffix="°" onChange={(v) => patchEl(sel.id, { rot: v })} />
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { l: L("Gauche", "يسار"), p: { x: 0.25 } },
                        { l: L("Centre", "وسط"), p: { x: 0.5 } },
                        { l: L("Droite", "يمين"), p: { x: 0.75 } },
                        { l: L("Poitrine", "الصدر"), p: { x: 0.72, y: 0.14 } },
                        { l: L("Milieu", "منتصف"), p: { x: 0.5, y: 0.45 } },
                        { l: L("Bas", "أسفل"), p: { y: 0.8 } },
                      ].map((o) => (
                        <button key={o.l} type="button" onClick={() => patchEl(sel.id, o.p, true)} className="min-h-9 rounded-lg bg-ink/5 text-[11px] font-semibold hover:bg-ink/10">
                          {o.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SUMMARY */}
                <div className="rounded-2xl glass p-4">
                  <ul className="space-y-1 text-xs text-mut">
                    <li className="flex justify-between"><span>{model.name}</span><span>{formatDA(base)} DA</span></li>
                    {hasImage && (
                      <li className="flex justify-between"><span>{L("Impression image", "طباعة صورة")}</span><span>+{formatDA(settings?.image_print_surcharge_da ?? 0)} DA</span></li>
                    )}
                    {texts.length > 0 && (
                      <li className="flex justify-between"><span>{L("Impression texte", "طباعة نص")}</span><span>+{formatDA(settings?.text_print_surcharge_da ?? 0)} DA</span></li>
                    )}
                  </ul>
                  <div className="mt-2 flex items-baseline justify-between border-t border-line pt-2">
                    <span className="text-sm text-mut">{t("cart.total")}</span>
                    <span className="text-xl font-semibold" data-testid="custom-price">
                      {formatDA(price)} <span className="text-xs text-mut">DA</span>
                    </span>
                  </div>
                  <p className="mt-2 text-[11px] text-mut">{t("custom.priceNote")}</p>
                  <button
                    type="button"
                    onClick={() => void addToCart()}
                    disabled={saving || uploading > 0 || design.els.length === 0}
                    className="btn-primary mt-4 w-full disabled:opacity-50"
                  >
                    {saving ? (
                      <><Loader2 className="size-4 animate-spin" /> {L("Préparation du design…", "تجهيز التصميم…")}</>
                    ) : added ? (
                      <><Check className="size-4" /> {t("product.added")}</>
                    ) : (
                      t("custom.add")
                    )}
                  </button>
                  {design.els.length === 0 && (
                    <p className="mt-2 text-center text-[11px] text-mut">{L("Ajoute au moins un texte ou une image.", "أضف نصا أو صورة على الأقل.")}</p>
                  )}
                  {added && (
                    <Link to="/cart" className="btn-ghost mt-2 w-full">{t("cart.title")}</Link>
                  )}
                </div>
              </div>
            </div>

            {/* EXAMPLES */}
            <section className="mt-12" aria-labelledby="examples-title">
              <p className="label">{L("Prêts à personnaliser", "جاهزة للتخصيص")}</p>
              <h2 id="examples-title" className="font-display text-2xl leading-none">{L("Exemples de designs", "أمثلة تصاميم")}</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {EXAMPLES.map((ex, i) => (
                  <ExampleCard key={ex.id} design={ex.design()} label={ex.label} onPick={() => { loadExample(i); window.scrollTo({ top: 0, behavior: "smooth" }); }} cta={L("Utiliser", "استخدم")} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

/** Tinted garment: colour layer masked by the mockup, fabric shading multiplied on top. */
function Garment({ src, color, className }: { src: string; color: string; className?: string }) {
  const mask = { WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" } as const;
  return (
    <div className={`relative isolate ${className ?? ""}`}>
      <div className="absolute inset-0" style={{ backgroundColor: color, ...mask }} />
      <img src={src} alt="" draggable={false} width={900} height={900} className="absolute inset-0 size-full object-contain mix-blend-multiply" />
      <img src={src} alt="" aria-hidden draggable={false} width={900} height={900} className="absolute inset-0 size-full object-contain opacity-10 mix-blend-screen" />
    </div>
  );
}

function ExampleCard({ design, label, onPick, cta }: { design: Design; label: string; onPick: () => void; cta: string }) {
  const m = MODELS.find((x) => x.id === design.model) ?? MODELS[0]!;
  const side: Side = design.els.some((e) => e.side === "back") && !design.els.some((e) => e.side === "front" && e.w > 0.15) ? "back" : "front";
  const show: Side = design.els.some((e) => e.side === "back") ? "back" : side;
  return (
    <article className="overflow-hidden rounded-xl bg-panel">
      <div className="grid grid-cols-2">
        {(["front", "back"] as const).map((s) => (
          <MiniPreview key={s} design={design} side={s} img={m.img[s]} area={m.area[s]} dim={s !== show && s !== "front"} />
        ))}
      </div>
      <div className="p-2.5">
        <h3 className="truncate text-xs font-semibold">{label}</h3>
        <p className="truncate text-[10px] text-mut">{m.name} · {design.color.name}</p>
        <button type="button" onClick={onPick} className="mt-2 min-h-9 w-full rounded-md bg-ink/5 text-[11px] font-semibold transition-colors hover:bg-accent hover:text-accent-foreground">
          {cta}
        </button>
      </div>
    </article>
  );
}

function MiniPreview({ design, side, img, area, dim }: { design: Design; side: Side; img: string; area: { l: number; t: number; w: number; h: number }; dim?: boolean }) {
  return (
    <div className={`relative aspect-square ${dim ? "opacity-80" : ""}`}>
      <Garment src={img} color={design.color.hex} className="absolute inset-0" />
      <div className="absolute" style={{ left: `${area.l}%`, top: `${area.t}%`, width: `${area.w}%`, height: `${area.h}%`, containerType: "inline-size" }}>
        {design.els.filter((e) => e.side === side).map((el) => (
          <div key={el.id} className="absolute" style={{ left: `${el.x * 100}%`, top: `${el.y * 100}%`, width: el.kind === "image" ? `${el.w * 100}%` : undefined, transform: `translate(-50%,-50%) rotate(${el.rot}deg)` }}>
            {el.kind === "image" ? (
              <img src={el.src} alt="" className="block w-full" />
            ) : (
              <span className="block whitespace-nowrap leading-none" style={{ fontFamily: fontCss(el.font ?? "display"), fontWeight: el.font === "display" ? 400 : 700, fontSize: `${el.w * 100}cqw`, color: el.color }}>
                {el.text}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Slider({ label, min, max, value, onChange, suffix = "%" }: { label: string; min: number; max: number; value: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] text-mut">
        <span>{label}</span>
        <span>{value}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-accent" />
    </label>
  );
}
