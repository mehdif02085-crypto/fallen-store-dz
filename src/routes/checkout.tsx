import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { formatDA, isValidAlgerianPhone, normalizePhone } from "@/lib/format";
import { deliverySettingsQuery, paymentMethodsQuery, wilayasQuery } from "@/lib/queries";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Commander — livraison 58 wilayas | Fallen Store" },
      {
        name: "description",
        content:
          "Finalisez votre commande Fallen Store : nom, téléphone, wilaya, commune et adresse. Paiement à la livraison disponible partout en Algérie.",
      },
      { property: "og:title", content: "Commander | Fallen Store" },
      {
        property: "og:description",
        content: "Livraison dans les 58 wilayas, paiement à la livraison.",
      },
    ],
  }),
  component: Checkout,
});

const SIZES = ["S", "M", "L", "XL", "XXL"];

function Checkout() {
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();
  const { data: wilayas = [] } = useQuery(wilayasQuery);
  const { data: methods = [] } = useQuery(paymentMethodsQuery);
  const { data: delivery } = useQuery(deliverySettingsQuery);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilayaCode, setWilayaCode] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [size, setSize] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const enabled = methods.filter((m) => m.is_enabled);
  const activeMethod = method || enabled[0]?.code || "";

  const wilaya = wilayas.find((w) => String(w.code) === wilayaCode);
  const threshold = delivery?.free_shipping_threshold_da ?? null;
  const freeShipping = threshold != null && subtotal >= threshold;
  const fee = wilaya ? (freeShipping ? 0 : wilaya.delivery_fee_da) : null;
  const total = subtotal + (fee ?? 0);

  const disabledSubmit = useMemo(
    () => items.length === 0 || enabled.length === 0 || submitting,
    [items.length, enabled.length, submitting],
  );

  function validate() {
    const e: Record<string, string> = {};
    if (fullName.trim().length < 3) e["fullName"] = t("checkout.err.name");
    if (!isValidAlgerianPhone(phone)) e["phone"] = t("checkout.err.phone");
    if (!wilayaCode) e["wilaya"] = t("checkout.err.wilaya");
    if (city.trim().length < 2) e["city"] = t("checkout.err.city");
    if (address.trim().length < 8) e["address"] = t("checkout.err.address");
    if (!size) e["size"] = t("checkout.err.size");
    if (!activeMethod) e["method"] = t("checkout.err.payment");
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setFormError(null);
    if (items.length === 0) {
      setFormError(t("checkout.err.empty"));
      return;
    }
    if (!validate()) return;
    setSubmitting(true);

    const payloadItems = items.map((i) =>
      i.kind === "custom"
        ? { kind: "custom", quantity: i.quantity, ...i.custom }
        : { kind: "product", quantity: i.quantity, variant_id: i.variantId },
    );

    const { data, error } = await supabase.rpc("place_order", {
      p_customer: {
        full_name: fullName.trim(),
        phone: normalizePhone(phone),
        wilaya_code: wilayaCode,
        city: city.trim(),
        address: address.trim(),
        clothing_size: size,
        delivery_notes: notes.trim(),
      },
      p_items: payloadItems,
      p_payment_method: activeMethod,
    });

    setSubmitting(false);

    if (error) {
      const msg = error.message || "";
      if (msg.includes("OUT_OF_STOCK")) setFormError(t("checkout.err.stock"));
      else if (msg.includes("PAYMENT_METHOD")) setFormError(t("checkout.notConfigured"));
      else if (msg.includes("INVALID_PHONE")) setFormError(t("checkout.err.phone"));
      else setFormError(t("checkout.err.generic"));
      return;
    }

    const result = data as { order_number: string } | null;
    if (!result?.order_number) {
      setFormError(t("checkout.err.generic"));
      return;
    }
    clear();
    void navigate({
      to: "/order",
      search: { number: result.order_number, phone: normalizePhone(phone), new: true },
    });
  }

  function Err({ name }: { name: string }) {
    const msg = errors[name];
    if (!msg) return null;
    return <p className="mt-1 text-[11px] text-danger">{msg}</p>;
  }

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-5 pt-6">
        <h1 className="font-display text-4xl leading-none">{t("checkout.title")}</h1>

        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl glass p-6 text-center">
            <p className="text-sm text-mut">{t("cart.empty")}</p>
            <Link to="/shop" className="btn-primary mt-4">
              {t("cart.continue")}
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <h2 className="font-display text-xl leading-none">{t("checkout.customer")}</h2>

              <div>
                <label className="label" htmlFor="fullName">
                  {t("checkout.name")} *
                </label>
                <input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                  required
                  className="field"
                />
                <Err name="fullName" />
              </div>

              <div>
                <label className="label" htmlFor="phone">
                  {t("checkout.phone")} *
                </label>
                <input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                  placeholder="0555123456"
                  required
                  className="field"
                  dir="ltr"
                />
                <Err name="phone" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="wilaya">
                    {t("checkout.wilaya")} *
                  </label>
                  <select
                    id="wilaya"
                    value={wilayaCode}
                    onChange={(e) => setWilayaCode(e.target.value)}
                    required
                    className="field"
                  >
                    <option value="">{t("checkout.wilayaPick")}</option>
                    {wilayas.map((w) => (
                      <option key={w.code} value={String(w.code)}>
                        {String(w.code).padStart(2, "0")} —{" "}
                        {lang === "ar" ? w.name_ar : w.name_fr}
                      </option>
                    ))}
                  </select>
                  <Err name="wilaya" />
                </div>
                <div>
                  <label className="label" htmlFor="city">
                    {t("checkout.city")} *
                  </label>
                  <input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    maxLength={120}
                    required
                    className="field"
                  />
                  <Err name="city" />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="address">
                  {t("checkout.address")} *
                </label>
                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  maxLength={400}
                  required
                  className="field"
                />
                <Err name="address" />
              </div>

              <div>
                <p className="label">{t("checkout.size")} *</p>
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
                <Err name="size" />
              </div>

              <div>
                <label className="label" htmlFor="notes">
                  {t("checkout.notes")}
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  maxLength={300}
                  className="field"
                />
              </div>

              <h2 className="pt-2 font-display text-xl leading-none">
                {t("checkout.payment")}
              </h2>
              <div className="space-y-2">
                {methods.map((m) => {
                  const available = m.is_enabled;
                  return (
                    <label
                      key={m.code}
                      className={`flex items-start gap-3 rounded-2xl glass p-3 ${
                        available ? "cursor-pointer" : "opacity-55"
                      }`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value={m.code}
                        disabled={!available}
                        checked={activeMethod === m.code}
                        onChange={() => setMethod(m.code)}
                        className="mt-1 accent-accent"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {lang === "ar" ? m.name_ar : m.name_fr}
                          {!available && (
                            <span className="ms-2 rounded-full bg-ink/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-mut">
                              {t("checkout.unavailable")}
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-mut">
                          {available
                            ? (lang === "ar" ? m.description_ar : m.description_fr) ?? ""
                            : t("checkout.notConfigured")}
                        </span>
                      </span>
                    </label>
                  );
                })}
                <Err name="method" />
              </div>
            </div>

            {/* SUMMARY */}
            <aside className="h-fit rounded-2xl glass p-4 md:sticky md:top-4">
              <h2 className="font-display text-xl leading-none">{t("checkout.summary")}</h2>
              <ul className="mt-3 space-y-2">
                {items.map((i) => (
                  <li key={i.key} className="flex justify-between gap-2 text-xs">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold uppercase">{i.name}</span>
                      <span className="text-mut">
                        {i.size} · {i.colorName} · ×{i.quantity}
                      </span>
                      {i.custom?.custom_text && (
                        <span className="block text-mut">“{i.custom.custom_text}”</span>
                      )}
                      {i.custom?.design_image_url && (
                        <span className="block text-mut">{t("custom.upload")} ✓</span>
                      )}
                    </span>
                    <span className="whitespace-nowrap font-semibold">
                      {formatDA(i.unitPrice * i.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-mut">{t("cart.subtotal")}</span>
                  <span>{formatDA(subtotal)} DA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mut">{t("cart.delivery")}</span>
                  <span>
                    {fee == null
                      ? t("cart.deliveryAtCheckout")
                      : fee === 0
                        ? t("checkout.freeDelivery")
                        : `${formatDA(fee)} DA`}
                  </span>
                </div>
                <div className="flex justify-between pt-1 text-base font-semibold">
                  <span>{t("cart.total")}</span>
                  <span>{formatDA(total)} DA</span>
                </div>
              </div>

              {formError && <p className="mt-3 text-xs text-danger">{formError}</p>}

              <button type="submit" disabled={disabledSubmit} className="btn-primary mt-4 w-full">
                {submitting ? t("checkout.placing") : t("checkout.place")}
              </button>
              {enabled.length === 0 && (
                <p className="mt-2 text-[11px] text-mut">{t("checkout.notConfigured")}</p>
              )}
            </aside>
          </form>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
