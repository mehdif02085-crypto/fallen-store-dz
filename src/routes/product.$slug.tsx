import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { Img } from "@/components/img";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { useI18n } from "@/lib/i18n";
import { formatDA } from "@/lib/format";
import { useCart } from "@/lib/cart";
import { effectivePrice, productQuery, productsQuery, sortImages } from "@/lib/queries";

export const Route = createFileRoute("/product/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} | Fallen Store` },
      {
        name: "description",
        content:
          "Détail du produit Fallen Store : tailles, couleurs, stock et prix en DA. Livraison partout en Algérie, paiement à la livraison.",
      },
      { property: "og:title", content: `${params.slug.replace(/-/g, " ")} | Fallen Store` },
      {
        property: "og:description",
        content: "Coton heavyweight, coupe oversized. Ajoutez au panier en une taille.",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const { add } = useCart();
  const { data: product, isLoading } = useQuery(productQuery(slug));
  const { data: all = [] } = useQuery(productsQuery);

  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colors = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of product?.product_variants ?? []) map.set(v.color_name, v.color_hex);
    return [...map.entries()].map(([name, hex]) => ({ name, hex }));
  }, [product]);

  const activeColor = color ?? colors[0]?.name ?? null;

  const sizes = useMemo(
    () =>
      (product?.product_variants ?? [])
        .filter((v) => v.color_name === activeColor)
        .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true })),
    [product, activeColor],
  );

  const variant = sizes.find((v) => v.size === size) ?? null;
  const images = product ? sortImages(product) : [];
  const price = product ? effectivePrice(product) : 0;
  const related = all.filter((p) => p.slug !== slug).slice(0, 4);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-5 py-20 text-sm text-mut">…</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-canvas">
        <SiteHeader />
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <p className="text-sm text-mut">{t("product.notFound")}</p>
          <Link to="/shop" className="btn-primary mt-4">
            {t("nav.shop")}
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  function addToCart() {
    if (!variant) {
      setError(t("product.selectSize"));
      return;
    }
    if (variant.stock < 1) {
      setError(t("product.outOfStock"));
      return;
    }
    setError(null);
    add({
      kind: "product",
      name: product!.name,
      unitPrice: price,
      quantity: 1,
      size: variant.size,
      colorName: variant.color_name,
      image: images[0]?.square_url ?? images[0]?.url ?? null,
      slug: product!.slug,
      variantId: variant.id,
      maxStock: variant.stock,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  const description = lang === "ar" ? product.description_ar : product.description_fr;

  return (
    <div className="min-h-screen bg-canvas pb-28">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <Link to="/shop" className="flex items-center gap-1 text-xs text-mut">
            <ArrowLeft className="size-3.5" /> {t("nav.shop")}
          </Link>
          <span className="text-[11px] uppercase tracking-widest text-mut">
            / {product.categories ? (lang === "ar" ? product.categories.name_ar : product.categories.name_fr) : ""}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="aspect-[3/4] overflow-hidden rounded-xl bg-panel">
            {images[0] && (
              <Img
                src={images[0].url}
                alt={images[0].alt ?? product.name}
                eager
                width={768}
                height={960}
                className="size-full object-cover"
              />
            )}
          </div>
          <div className="grid grid-rows-2 gap-2">
            {images.slice(1, 3).map((img) => (
              <div key={img.id} className="aspect-square overflow-hidden rounded-xl bg-panel">
                <Img
                  src={img.url}
                  alt={img.alt ?? product.name}
                  width={768}
                  height={768}
                  className="size-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="font-display text-3xl leading-none">{product.name}</h1>
            <p className="text-lg font-semibold">
              {product.sale_price_da != null && (
                <span className="me-2 text-xs font-normal text-mut line-through">
                  {formatDA(product.price_da)}
                </span>
              )}
              <span className={product.sale_price_da != null ? "text-accent" : ""}>
                {formatDA(price)}
              </span>{" "}
              <span className="text-xs text-mut">DA</span>
            </p>
          </div>
          {product.subtitle && <p className="mt-1 text-xs text-mut">{product.subtitle}</p>}
          {description && (
            <p className="mt-3 max-w-[46ch] text-sm text-mut">{description}</p>
          )}

          {colors.length > 0 && (
            <>
              <p className="label mt-5">
                {t("product.color")} — {activeColor}
              </p>
              <div className="flex gap-2">
                {colors.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    aria-label={c.name}
                    onClick={() => {
                      setColor(c.name);
                      setSize(null);
                    }}
                    style={{ backgroundColor: c.hex }}
                    className={`size-7 rounded-full ${
                      activeColor === c.name
                        ? "ring-2 ring-accent ring-offset-2 ring-offset-canvas"
                        : "ring-1 ring-line"
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          <p className="label mt-4">{t("product.size")}</p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.stock < 1}
                onClick={() => {
                  setSize(v.size);
                  setError(null);
                }}
                className={`chip ${size === v.size ? "chip-active" : ""} ${
                  v.stock < 1 ? "text-mut line-through opacity-50" : ""
                }`}
              >
                {v.size}
              </button>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-1.5 text-xs text-mut">
            <span className="size-1.5 rounded-full bg-accent" />
            {variant
              ? `${variant.stock} ${t("product.stockLeft")} — ${t("product.ship")}`
              : t("product.ship")}
          </p>

          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
        </div>

        <section className="pt-12">
          <h2 className="mb-4 font-display text-2xl leading-none">{t("home.featured")}</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {related.map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 50} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* Sticky add-to-cart */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-gradient-to-t from-canvas via-canvas/90 to-transparent px-4 pb-4 pt-2">
        <div className="mx-auto flex max-w-6xl items-center gap-3 rounded-2xl glass p-2">
          <div className="ps-1">
            <p className="text-[10px] leading-none text-mut">{product.name}</p>
            <p className="mt-1 text-sm font-semibold">
              {formatDA(price)}{" "}
              <span className="text-[10px] text-mut">
                DA{size ? ` · ${size}` : ""}
              </span>
            </p>
          </div>
          <button type="button" onClick={addToCart} className="btn-primary ms-auto">
            {added ? (
              <>
                <Check className="size-4" /> {t("product.added")}
              </>
            ) : (
              t("product.add")
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
