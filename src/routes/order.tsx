import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Search } from "lucide-react";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useI18n, type TKey } from "@/lib/i18n";
import { formatDA } from "@/lib/format";

type OrderSearch = { number?: string; phone?: string; new?: boolean };

type OrderItem = {
  product_name: string;
  size: string;
  color_name: string;
  quantity: number;
  unit_price_da: number;
  line_total_da: number;
};

type OrderResult = {
  order_number: string;
  customer_name: string;
  wilaya_name: string;
  city: string;
  address: string;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal_da: number;
  delivery_fee_da: number;
  total_da: number;
  created_at: string;
  items: OrderItem[];
};

export const Route = createFileRoute("/order")({
  validateSearch: (search: Record<string, unknown>): OrderSearch => ({
    number: typeof search.number === "string" ? search.number : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
    new: search.new === true || search.new === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Suivi de commande | Fallen Store" },
      {
        name: "description",
        content:
          "Confirmation et suivi de votre commande Fallen Store avec votre numéro de commande et votre téléphone.",
      },
      { property: "og:title", content: "Suivi de commande | Fallen Store" },
      { property: "og:description", content: "Retrouvez l'état de votre commande." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { t, lang } = useI18n();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const [number, setNumber] = useState(search.number ?? "");
  const [phone, setPhone] = useState(search.phone ?? "");

  const lookup = useQuery({
    queryKey: ["order", search.number, search.phone],
    enabled: Boolean(search.number && search.phone),
    queryFn: async (): Promise<OrderResult | null> => {
      const { data, error } = await supabase.rpc("get_order_by_number", {
        p_order_number: search.number!,
        p_phone: search.phone!,
      });
      if (error) throw error;
      return (data as unknown as OrderResult) ?? null;
    },
  });

  const order = lookup.data ?? null;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-5 pt-6">
        {search.new && order && (
          <div className="rounded-2xl glass p-5 text-center rise">
            <CheckCircle2 className="mx-auto size-8 text-accent" />
            <h1 className="mt-3 font-display text-3xl leading-none">{t("confirm.title")}</h1>
            <p className="mt-2 text-sm text-mut">{t("confirm.thanks")}</p>
            <p className="mt-3 text-[11px] uppercase tracking-widest text-mut">
              {t("confirm.number")}
            </p>
            <p className="font-display text-2xl" dir="ltr">
              {order.order_number}
            </p>
            <p className="mt-2 text-xs text-mut">{t("confirm.callback")}</p>
          </div>
        )}

        {!search.new && (
          <h1 className="font-display text-4xl leading-none">{t("confirm.lookup")}</h1>
        )}

        <form
          className="mt-5 rounded-2xl glass p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({
              search: { number: number.trim().toUpperCase(), phone: phone.trim() },
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="onum">
                {t("confirm.number")}
              </label>
              <input
                id="onum"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="FS-260101-12345"
                className="field"
                dir="ltr"
              />
            </div>
            <div>
              <label className="label" htmlFor="ophone">
                {t("checkout.phone")}
              </label>
              <input
                id="ophone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0555123456"
                className="field"
                dir="ltr"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary mt-3 w-full">
            <Search className="size-4" /> {t("confirm.lookupCta")}
          </button>
        </form>

        {lookup.isFetched && !order && (
          <p className="mt-4 text-center text-xs text-mut">{t("confirm.notFound")}</p>
        )}

        {order && (
          <section className="mt-5 rounded-2xl glass p-4">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl" dir="ltr">
                {order.order_number}
              </p>
              <span className="rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
                {t(`status.${order.status}` as TKey)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-mut">
              {new Date(order.created_at).toLocaleDateString(lang === "ar" ? "ar-DZ" : "fr-DZ")}
            </p>

            <ul className="mt-4 space-y-2 border-t border-line pt-3">
              {order.items.map((i, idx) => (
                <li key={idx} className="flex justify-between gap-2 text-xs">
                  <span>
                    <span className="block font-semibold uppercase">{i.product_name}</span>
                    <span className="text-mut">
                      {i.size} · {i.color_name} · ×{i.quantity}
                    </span>
                  </span>
                  <span className="whitespace-nowrap font-semibold">
                    {formatDA(i.line_total_da)} DA
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <span className="text-mut">{t("cart.subtotal")}</span>
                <span>{formatDA(order.subtotal_da)} DA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-mut">{t("cart.delivery")}</span>
                <span>
                  {order.delivery_fee_da === 0
                    ? t("checkout.freeDelivery")
                    : `${formatDA(order.delivery_fee_da)} DA`}
                </span>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <span>{t("cart.total")}</span>
                <span>{formatDA(order.total_da)} DA</span>
              </div>
            </div>

            <div className="mt-3 border-t border-line pt-3 text-xs text-mut">
              <p>{order.customer_name}</p>
              <p>
                {order.address}, {order.city} — {order.wilaya_name}
              </p>
              <p className="mt-1">
                {t("checkout.payment")}: {order.payment_method.toUpperCase()} ·{" "}
                {t(`pay.${order.payment_status}` as TKey)}
              </p>
            </div>
          </section>
        )}

        <Link to="/shop" className="btn-ghost mt-5 w-full">
          {t("confirm.keepShopping")}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
