import { Link } from "@tanstack/react-router";
import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { Img } from "@/components/img";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { formatDA } from "@/lib/format";
import {
  effectivePrice,
  mainImage,
  totalStock,
  uniqueSizes,
  type Product,
} from "@/lib/queries";

export function ProductCard({ product, delay = 0 }: { product: Product; delay?: number }) {
  const { t } = useI18n();
  const { add } = useCart();
  const [size, setSize] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const sizes = uniqueSizes(product);
  const stock = totalStock(product);
  const price = effectivePrice(product);
  const image = mainImage(product);
  const onSale = product.sale_price_da != null;

  function addToCart() {
    const chosen = size ?? (sizes.length === 1 ? sizes[0]! : null);
    if (!chosen) {
      setSize(null);
      return;
    }
    const variant = (product.product_variants ?? []).find(
      (v) => v.size === chosen && v.stock > 0,
    );
    if (!variant) return;
    add({
      kind: "product",
      name: product.name,
      unitPrice: price,
      quantity: 1,
      size: variant.size,
      colorName: variant.color_name,
      image,
      slug: product.slug,
      variantId: variant.id,
      maxStock: variant.stock,
    });
    setDone(true);
    window.setTimeout(() => setDone(false), 1600);
  }

  return (
    <article
      className="overflow-hidden rounded-2xl glass rise"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Link to="/product/$slug" params={{ slug: product.slug }} className="block">
        <div className="relative aspect-square overflow-hidden bg-panel">
          <Img
            src={image}
            alt={product.name}
            width={1024}
            height={1024}
            className="size-full object-cover transition-transform duration-500 hover:scale-105"
          />
          {onSale && (
            <span className="absolute start-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
              {t("shop.sale")}
            </span>
          )}
          {stock === 0 && (
            <span className="absolute inset-0 grid place-items-center bg-canvas/70 text-[11px] font-semibold uppercase tracking-widest">
              {t("product.outOfStock")}
            </span>
          )}
        </div>
      </Link>

      <div className="p-3">
        <Link to="/product/$slug" params={{ slug: product.slug }}>
          <h3 className="text-sm font-semibold uppercase leading-tight">{product.name}</h3>
        </Link>
        {product.subtitle && <p className="mt-0.5 text-[11px] text-mut">{product.subtitle}</p>}

        <div className="mt-2 flex flex-wrap gap-1">
          {sizes.map((s) => {
            const available = (product.product_variants ?? []).some(
              (v) => v.size === s && v.stock > 0,
            );
            return (
              <button
                key={s}
                type="button"
                disabled={!available}
                onClick={() => setSize(s)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                  size === s
                    ? "bg-accent text-accent-foreground"
                    : "bg-ink/5 text-ink shadow-[inset_0_0_0_1px_var(--line)]"
                } ${available ? "" : "text-mut line-through opacity-50"}`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">
            {onSale && (
              <span className="me-1.5 text-[11px] font-normal text-mut line-through">
                {formatDA(product.price_da)}
              </span>
            )}
            <span className={onSale ? "text-accent" : ""}>{formatDA(price)}</span>{" "}
            <span className="text-[10px] text-mut">DA</span>
          </p>
          <button
            type="button"
            onClick={addToCart}
            disabled={stock === 0}
            aria-label={t("product.add")}
            className="grid size-8 place-items-center rounded-full glass disabled:opacity-40"
          >
            {done ? <Check className="size-4 text-accent" /> : <Plus className="size-4" />}
          </button>
        </div>
        {!size && sizes.length > 1 && (
          <p className="mt-2 text-[10px] text-mut">{t("product.selectSize")}</p>
        )}
      </div>
    </article>
  );
}
