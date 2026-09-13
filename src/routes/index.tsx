import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { useI18n } from "@/lib/i18n";
import { formatDA } from "@/lib/format";
import { categoriesQuery, customSettingsQuery, productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fallen Store — Streetwear algérien à Alger" },
      {
        name: "description",
        content:
          "Coton heavyweight, coupe oversized. T-shirts, hoodies et pantalons Fallen Store. Livraison dans les 58 wilayas et paiement à la livraison.",
      },
      { property: "og:title", content: "Fallen Store — Streetwear algérien à Alger" },
      {
        property: "og:description",
        content:
          "Nouveautés, meilleures ventes et t-shirts personnalisés. Prix en DA, livraison partout en Algérie.",
      },
    ],
  }),
  component: Home,
});

function SectionTitle({ title, to }: { title: string; to?: string }) {
  const { t } = useI18n();
  return (
    <div className="mb-4 flex items-end justify-between">
      <h2 className="font-display text-2xl leading-none">{title}</h2>
      {to && (
        <Link to={to} className="text-[11px] uppercase tracking-widest text-mut">
          {t("home.viewAll")}
        </Link>
      )}
    </div>
  );
}

function Home() {
  const { t, lang } = useI18n();
  const { data: products = [] } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: custom } = useQuery(customSettingsQuery);

  const newArrivals = products.filter((p) => p.is_new).slice(0, 4);
  const bestSellers = products.filter((p) => p.is_best_seller).slice(0, 4);
  const featured = products.filter((p) => p.is_featured).slice(0, 2);

  return (
    <div className="min-h-screen bg-canvas">
      {/* HERO */}
      <section className="relative isolate">
        <img
          src="/images/hero.jpg"
          alt="T-shirt Fallen Store en coton heavyweight"
          width={1088}
          height={1440}
          className="absolute inset-0 -z-10 h-[560px] w-full object-cover object-top"
        />
        <div className="absolute inset-0 -z-10 h-[600px] bg-gradient-to-b from-canvas/70 via-canvas/40 to-canvas" />

        <SiteHeader transparent />

        <div className="mx-auto max-w-6xl px-5 pb-10 pt-14">
          <p className="rise font-ar text-sm font-bold tracking-wide text-accent">
            {lang === "ar" ? "متجر فالن — الجزائر" : "متجر فالن — Alger, DZ"}
          </p>
          <h1 className="unwrap mt-2 font-display text-[68px] leading-[0.85]">
            {t("hero.line1")}
            <br />
            {t("hero.line2")}
          </h1>
          <p className="rise mt-4 max-w-[32ch] text-sm text-mut">{t("hero.text")}</p>
          <div className="rise mt-5 flex flex-wrap gap-2">
            <Link to="/shop" className="btn-primary">
              {t("hero.shop")}
            </Link>
            <Link to="/custom" className="btn-ghost">
              {t("hero.custom")}
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORY RAIL */}
      <section className="relative z-10 mx-auto -mt-2 max-w-6xl px-5">
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto rounded-2xl glass p-2">
          <Link
            to="/shop"
            className="shrink-0 rounded-xl bg-ink px-3.5 py-2 text-xs font-semibold text-canvas"
          >
            {t("shop.all")}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="shrink-0 rounded-xl bg-ink/5 px-3.5 py-2 text-xs font-semibold"
            >
              {lang === "ar" ? c.name_ar : c.name_fr}
            </Link>
          ))}
          <Link
            to="/shop"
            search={{ sale: true }}
            className="shrink-0 rounded-xl bg-ink/5 px-3.5 py-2 text-xs font-semibold text-accent"
          >
            {t("shop.sale")}
          </Link>
        </div>
      </section>

      {/* NEW ARRIVALS */}
      <section className="mx-auto max-w-6xl px-5 pt-8">
        <SectionTitle title={t("home.new")} to="/shop" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {newArrivals.map((p, i) => (
            <ProductCard key={p.id} product={p} delay={i * 60} />
          ))}
        </div>
      </section>

      {/* CUSTOM SHIRT PROMO */}
      <section className="mx-auto max-w-6xl px-5 pt-8">
        <div className="relative overflow-hidden rounded-3xl glass">
          <img
            src="/images/custom-promo.jpg"
            alt="T-shirt personnalisé Fallen Store"
            loading="lazy"
            width={1024}
            height={768}
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="relative p-5">
            <span className="inline-block rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
              {t("custom.badge")}
            </span>
            <h3 className="mt-3 font-display text-3xl leading-[0.9]">{t("custom.title")}</h3>
            <p className="mt-2 max-w-[38ch] text-sm text-mut">{t("custom.text")}</p>
            {custom && (
              <p className="mt-1 text-xs text-mut">
                {formatDA(custom.base_price_da)} DA +
              </p>
            )}
            <Link to="/custom" className="btn-solid mt-4">
              {t("custom.cta")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section className="mx-auto max-w-6xl px-5 pt-10">
        <SectionTitle title={t("home.best")} to="/shop" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {bestSellers.map((p, i) => (
            <ProductCard key={p.id} product={p} delay={i * 60} />
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="mx-auto max-w-6xl px-5 pt-10">
        <SectionTitle title={t("home.categories")} to="/categories" />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/shop"
              search={{ category: c.slug }}
              className="rounded-xl glass px-4 py-4 text-sm font-semibold uppercase"
            >
              {lang === "ar" ? c.name_ar : c.name_fr}
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pt-10">
          <SectionTitle title={t("home.featured")} to="/shop" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {featured.map((p, i) => (
              <ProductCard key={p.id} product={p} delay={i * 60} />
            ))}
          </div>
        </section>
      )}

      {/* SOCIAL */}
      <section className="mx-auto max-w-6xl px-5 pt-10">
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-2xl leading-none">@fallenstore.dz</h2>
          <span className="text-[11px] uppercase tracking-widest text-mut">
            {t("home.social")}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            "/images/products/heavyweight-tee.jpg",
            "/images/custom-promo.jpg",
            "/images/products/heavyweight-tee-fabric.jpg",
          ].map((src) => (
            <img
              key={src}
              src={src}
              alt="Fallen Store"
              loading="lazy"
              width={512}
              height={512}
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
