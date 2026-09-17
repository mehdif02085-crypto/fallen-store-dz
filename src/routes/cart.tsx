import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Img } from "@/components/img";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { formatDA } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Panier | Fallen Store" },
      {
        name: "description",
        content:
          "Votre panier Fallen Store : quantités, tailles et sous-total en DA avant le paiement.",
      },
      { property: "og:title", content: "Panier | Fallen Store" },
      { property: "og:description", content: "Vérifiez vos articles avant de commander." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { t } = useI18n();
  const { items, subtotal, setQuantity, remove } = useCart();

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pt-6">
        <h1 className="font-display text-4xl leading-none">{t("cart.title")}</h1>

        {items.length === 0 ? (
          <div className="mt-8 rounded-2xl glass p-6 text-center">
            <p className="text-sm text-mut">{t("cart.empty")}</p>
            <Link to="/shop" className="btn-primary mt-4">
              {t("cart.continue")}
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 space-y-3">
              {items.map((item) => (
                <li key={item.key} className="flex gap-3 rounded-2xl glass p-3">
                  <div className="size-20 shrink-0 overflow-hidden rounded-xl bg-panel">
                    <Img
                      src={item.image}
                      alt={item.name}
                      width={256}
                      height={256}
                      className="size-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold uppercase">{item.name}</p>
                        <p className="mt-0.5 text-[11px] text-mut">
                          {item.size} · {item.colorName}
                          {item.kind === "custom" ? ` · ${t("cart.custom")}` : ""}
                        </p>
                        {item.custom?.custom_text && (
                          <p className="mt-0.5 text-[11px] text-mut">
                            “{item.custom.custom_text}”
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.key)}
                        aria-label={t("cart.remove")}
                        className="grid size-7 place-items-center rounded-full glass text-mut"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="-"
                          onClick={() => setQuantity(item.key, item.quantity - 1)}
                          className="grid size-7 place-items-center rounded-full glass"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="+"
                          onClick={() => setQuantity(item.key, item.quantity + 1)}
                          disabled={item.quantity >= Math.min(item.maxStock ?? 20, 20)}
                          className="grid size-7 place-items-center rounded-full glass disabled:opacity-40"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold">
                        {formatDA(item.unitPrice * item.quantity)}{" "}
                        <span className="text-[10px] text-mut">DA</span>
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl glass p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-mut">{t("cart.subtotal")}</span>
                <span className="font-semibold">{formatDA(subtotal)} DA</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-mut">{t("cart.delivery")}</span>
                <span className="text-xs text-mut">{t("cart.deliveryAtCheckout")}</span>
              </div>
              <Link to="/checkout" className="btn-primary mt-4 w-full">
                {t("cart.checkout")}
              </Link>
              <Link
                to="/shop"
                className="mt-3 block text-center text-xs text-mut hover:text-ink"
              >
                {t("cart.continue")}
              </Link>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
