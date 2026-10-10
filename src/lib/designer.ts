import classicFront from "@/assets/mockups/classic-front.webp";
import classicBack from "@/assets/mockups/classic-back.webp";
import oversizedFront from "@/assets/mockups/oversized-front.webp";
import oversizedBack from "@/assets/mockups/oversized-back.webp";
import hoodieFront from "@/assets/mockups/hoodie-front.webp";
import hoodieBack from "@/assets/mockups/hoodie-back.webp";
import sweatFront from "@/assets/mockups/sweatshirt-front.webp";
import sweatBack from "@/assets/mockups/sweatshirt-back.webp";
import longFront from "@/assets/mockups/longsleeve-front.webp";
import longBack from "@/assets/mockups/longsleeve-back.webp";

export type Side = "front" | "back";
/** Printable area, in % of the square stage. */
export type Area = { l: number; t: number; w: number; h: number };

export type ShirtModel = {
  id: string;
  name: string;
  img: Record<Side, string>;
  area: Record<Side, Area>;
};

export const MODELS: ShirtModel[] = [
  {
    id: "classic",
    name: "Classic Tee",
    img: { front: classicFront, back: classicBack },
    area: { front: { l: 32, t: 26, w: 36, h: 46 }, back: { l: 32, t: 22, w: 36, h: 50 } },
  },
  {
    id: "oversized",
    name: "Oversized Tee",
    img: { front: oversizedFront, back: oversizedBack },
    area: { front: { l: 30, t: 30, w: 40, h: 42 }, back: { l: 29, t: 26, w: 42, h: 46 } },
  },
  {
    id: "hoodie",
    name: "Hoodie",
    img: { front: hoodieFront, back: hoodieBack },
    area: { front: { l: 33, t: 34, w: 34, h: 24 }, back: { l: 31, t: 36, w: 38, h: 40 } },
  },
  {
    id: "sweatshirt",
    name: "Sweatshirt",
    img: { front: sweatFront, back: sweatBack },
    area: { front: { l: 32, t: 28, w: 36, h: 42 }, back: { l: 31, t: 24, w: 38, h: 46 } },
  },
  {
    id: "longsleeve",
    name: "Long Sleeve",
    img: { front: longFront, back: longBack },
    area: { front: { l: 33, t: 26, w: 34, h: 48 }, back: { l: 33, t: 22, w: 34, h: 52 } },
  },
];

export const SHIRT_COLORS = [
  { name: "Noir", hex: "#111113" },
  { name: "Blanc", hex: "#f5f5f4" },
  { name: "Gris", hex: "#8b8b8f" },
  { name: "Rouge", hex: "#a8201a" },
  { name: "Bleu", hex: "#1f3a8a" },
  { name: "Os", hex: "#d9d3c3" },
  { name: "Olive", hex: "#4d5328" },
  { name: "Bordeaux", hex: "#5a1622" },
] as const;
export type ShirtColor = { name: string; hex: string };

export const FONTS = [
  { id: "display", label: "Anton", css: '"Anton", Impact, sans-serif' },
  { id: "body", label: "Inter", css: '"Inter", system-ui, sans-serif' },
  { id: "ar", label: "Cairo", css: '"Cairo", sans-serif' },
  { id: "serif", label: "Serif", css: 'Georgia, "Times New Roman", serif' },
  { id: "mono", label: "Mono", css: '"Courier New", monospace' },
] as const;
export const fontCss = (id: string) => FONTS.find((f) => f.id === id)?.css ?? FONTS[0].css;

export const INK_COLORS = ["#ffffff", "#111113", "#ff5a2c", "#d9d3c3", "#e11d2e", "#2563eb", "#facc15", "#22c55e"];

export type El = {
  id: string;
  kind: "text" | "image";
  side: Side;
  /** center, as fraction of the print area */
  x: number;
  y: number;
  /** image: width fraction of area · text: font-size fraction of area width */
  w: number;
  rot: number;
  text?: string;
  font?: string;
  color?: string;
  /** display source (object URL, data URL or bundled asset) */
  src?: string;
  /** storage path once uploaded */
  path?: string | null;
  /** height / width */
  aspect?: number;
};

export type Design = { model: string; color: ShirtColor; els: El[] };

export const uid = () => Math.random().toString(36).slice(2, 10);

const svg = (s: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(s)}`;

export const GRAPHICS = {
  star: svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><path d="M100 10 L122 78 L192 78 L136 120 L156 190 L100 148 L44 190 L64 120 L8 78 L78 78Z" fill="none" stroke="#ffffff" stroke-width="10" stroke-linejoin="miter"/><path d="M100 60 L100 140" stroke="#ff5a2c" stroke-width="10"/></svg>`,
  ),
  badge: svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><circle cx="120" cy="120" r="110" fill="none" stroke="#111113" stroke-width="8"/><circle cx="120" cy="120" r="86" fill="none" stroke="#111113" stroke-width="3"/><text x="120" y="112" text-anchor="middle" font-family="Impact, Anton, sans-serif" font-size="46" fill="#111113">FALLEN</text><text x="120" y="156" text-anchor="middle" font-family="Impact, Anton, sans-serif" font-size="30" fill="#ff5a2c">DZ · 213</text></svg>`,
  ),
  mountain: svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 260"><circle cx="210" cy="80" r="44" fill="#ff5a2c"/><path d="M0 240 L90 90 L140 160 L190 110 L300 240Z" fill="#111113"/><path d="M90 90 L110 124 L72 122Z" fill="#d9d3c3"/><rect x="0" y="236" width="300" height="10" fill="#111113"/></svg>`,
  ),
  waves: svg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><g fill="none" stroke="#ffffff" stroke-width="9"><path d="M20 80 Q95 30 150 80 T280 80"/><path d="M20 130 Q95 80 150 130 T280 130"/><path d="M20 180 Q95 130 150 180 T280 180"/></g><path d="M20 230 Q95 180 150 230 T280 230" fill="none" stroke="#ff5a2c" stroke-width="9"/></svg>`,
  ),
};

export type Example = { id: string; label: string; design: () => Design };

const C = (name: string) => SHIRT_COLORS.find((c) => c.name === name) ?? SHIRT_COLORS[0];

export const EXAMPLES: Example[] = [
  {
    id: "minimal",
    label: "Minimal chest logo",
    design: () => ({
      model: "classic",
      color: C("Noir"),
      els: [
        { id: uid(), kind: "image", side: "front", x: 0.72, y: 0.14, w: 0.18, rot: 0, src: GRAPHICS.star, aspect: 1 },
      ],
    }),
  },
  {
    id: "oversize-back",
    label: "Oversized · back graphic",
    design: () => ({
      model: "oversized",
      color: C("Blanc"),
      els: [
        { id: uid(), kind: "text", side: "front", x: 0.5, y: 0.12, w: 0.08, rot: 0, text: "FALLEN STORE", font: "display", color: "#111113" },
        { id: uid(), kind: "image", side: "back", x: 0.5, y: 0.45, w: 0.85, rot: 0, src: GRAPHICS.mountain, aspect: 260 / 300 },
      ],
    }),
  },
  {
    id: "typo",
    label: "Custom typography",
    design: () => ({
      model: "classic",
      color: C("Noir"),
      els: [
        { id: uid(), kind: "text", side: "front", x: 0.5, y: 0.3, w: 0.2, rot: 0, text: "MOVE", font: "display", color: "#ffffff" },
        { id: uid(), kind: "text", side: "front", x: 0.5, y: 0.5, w: 0.2, rot: 0, text: "QUIET", font: "display", color: "#ff5a2c" },
        { id: uid(), kind: "text", side: "front", x: 0.5, y: 0.66, w: 0.05, rot: 0, text: "ALGIERS — 2026", font: "mono", color: "#ffffff" },
      ],
    }),
  },
  {
    id: "street",
    label: "Front logo + back art",
    design: () => ({
      model: "oversized",
      color: C("Gris"),
      els: [
        { id: uid(), kind: "image", side: "front", x: 0.5, y: 0.22, w: 0.3, rot: 0, src: GRAPHICS.waves, aspect: 1 },
        { id: uid(), kind: "image", side: "back", x: 0.5, y: 0.42, w: 0.8, rot: -6, src: GRAPHICS.badge, aspect: 1 },
      ],
    }),
  },
  {
    id: "hoodie-name",
    label: "Hoodie · your name",
    design: () => ({
      model: "hoodie",
      color: C("Bordeaux"),
      els: [
        { id: uid(), kind: "text", side: "front", x: 0.5, y: 0.45, w: 0.16, rot: 0, text: "YACINE", font: "display", color: "#ffffff" },
        { id: uid(), kind: "text", side: "back", x: 0.5, y: 0.3, w: 0.2, rot: 0, text: "10", font: "display", color: "#ffffff" },
      ],
    }),
  },
];

/* ---------------- canvas export ---------------- */

function loadImg(src: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

/** Renders one side of the design to a canvas, using the same geometry as the live preview. */
export async function renderSide(design: Design, side: Side, size = 900, bg = "#ececec") {
  const model = MODELS.find((m) => m.id === design.model) ?? MODELS[0];
  const cv = document.createElement("canvas");
  cv.width = size;
  cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  const mock = await loadImg(model.img[side]);
  const tint = document.createElement("canvas");
  tint.width = size;
  tint.height = size;
  const tc = tint.getContext("2d")!;
  tc.drawImage(mock, 0, 0, size, size);
  tc.globalCompositeOperation = "source-in";
  tc.fillStyle = design.color.hex;
  tc.fillRect(0, 0, size, size);
  tc.globalCompositeOperation = "multiply";
  tc.drawImage(mock, 0, 0, size, size);
  tc.globalCompositeOperation = "destination-in";
  tc.drawImage(mock, 0, 0, size, size);
  ctx.drawImage(tint, 0, 0);
  ctx.globalAlpha = 0.1;
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(mock, 0, 0, size, size);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";

  const a = model.area[side];
  const ax = (a.l / 100) * size;
  const ay = (a.t / 100) * size;
  const aw = (a.w / 100) * size;
  const ah = (a.h / 100) * size;

  for (const el of design.els.filter((e) => e.side === side)) {
    ctx.save();
    ctx.translate(ax + el.x * aw, ay + el.y * ah);
    ctx.rotate((el.rot * Math.PI) / 180);
    if (el.kind === "image" && el.src) {
      try {
        const im = await loadImg(el.src);
        const w = el.w * aw;
        const h = w * (el.aspect ?? im.naturalHeight / im.naturalWidth);
        ctx.drawImage(im, -w / 2, -h / 2, w, h);
      } catch {
        /* skip unreadable image */
      }
    } else if (el.kind === "text" && el.text) {
      ctx.fillStyle = el.color ?? "#ffffff";
      ctx.font = `${el.font === "display" ? "400" : "700"} ${el.w * aw}px ${fontCss(el.font ?? "display")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(el.text, 0, 0);
    }
    ctx.restore();
  }
  return cv;
}

export function canvasBlob(cv: HTMLCanvasElement, type = "image/jpeg", q = 0.88) {
  return new Promise<Blob>((res, rej) =>
    cv.toBlob((b) => (b ? res(b) : rej(new Error("export failed"))), type, q),
  );
}

/** Rasterizes any image source (e.g. bundled SVG graphic) to a PNG blob for upload. */
export async function rasterize(src: string, max = 1200) {
  const im = await loadImg(src);
  const r = Math.min(1, max / Math.max(im.naturalWidth || max, im.naturalHeight || max));
  const w = Math.round((im.naturalWidth || max) * r);
  const h = Math.round((im.naturalHeight || max) * r);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  cv.getContext("2d")!.drawImage(im, 0, 0, w, h);
  return canvasBlob(cv, "image/png");
}

/** Serializable layout saved with the order (no local blob URLs). */
export function toLayout(d: Design) {
  return {
    version: 1,
    model: d.model,
    color: d.color,
    elements: d.els.map(({ src: _s, ...rest }) => rest),
  };
}
