import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProductCard } from "@/components/product-card";
import { useI18n } from "@/lib/i18n";
import { categoriesQuery, effectivePrice, productsQuery } from "@/lib/queries";

type ShopSearch = { category?: string; sale?: boolean; q?: string };

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    category: typeof search.category === "string" ? search.category : undefined,
    sale: search.sale === true || search.sale === "true" ? true : undefined,
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Boutique — tous les produits | Fallen Store" },
      {
        name: "description",
        content:
          "Tous les produits Fallen Store : t-shirts, oversized, hoodies, sweatshirts, pantalons et accessoires. Prix en DA, tailles et stock en temps réel.",
      },
      { property: "og:title", content: "Boutique — tous les produits | Fallen Store" },
      {
        property: "og:description",
        content: "Filtrez par catégorie, taille et prix. Livraison dans toute l'Algérie.",
      },
    ],
  }),
  component: Shop,
});

type Sort = "new" | "priceAsc" | "priceDesc";

function Shop() {
  const { t, lang } = useI18n();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: products = [], isLoading } = useQuery(productsQuery);
  const { data: categories = [] } = useQuery(categoriesQuery);
  const [query, setQuery] = useState(search.q ?? "");
  const [sort, setSort] = useState<Sort>("new");

  const visible = useMemo(() => {
    let list = products;
    if (search.category) {
      list = list.filter((p) => p.categories?.slug === search.category);
    }
    if (search.sale) list = list.filter((p) => p.sale_price_da != null);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.subtitle ?? "").toLowerCase().includes(q) ||
          (p.description_fr ?? "").toLowerCase().includes(q) ||
          (p.description_ar ?? "").includes(query.trim()),
      );
    }
    const sorted = [...list];
    if (sort === "priceAsc") sorted.sort((a, b) => effectivePrice(a) - effectivePrice(b));
    if (sort === "priceDesc") sorted.sort((a, b) => effectivePrice(b) - effectivePrice(a));
    return sorted;
  }, [products, search.category, search.sale, query, sort]);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-6 pt-6">
        <h1 className="font-display text-4xl leading-none">{t("shop.title")}</h1>

        <div className="mt-5 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-mut" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("shop.search")}
              className="field ps-9"
              aria-label={t("shop.search")}
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            aria-label={t("shop.sort")}
            className="field w-auto"
          >
            <option value="new">{t("sort.new")}</option>
            <option value="priceAsc">{t("sort.priceAsc")}</option>
            <option value="priceDesc">{t("sort.priceDesc")}</option>
          </select>
        </div>

        <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => navigate({ search: {} })}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              !search.category && !search.sale ? "bg-ink text-canvas" : "bg-ink/5"
            }`}
          >
            {t("shop.all")}
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => navigate({ search: { category: c.slug } })}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold ${
                search.category === c.slug ? "bg-ink text-canvas" : "bg-ink/5"
              }`}
            >
              {lang === "ar" ? c.name_ar : c.name_fr}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate({ search: { sale: true } })}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold ${
              search.sale ? "bg-accent text-accent-foreground" : "bg-ink/5 text-accent"
            }`}
          >
            {t("shop.sale")}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
          {visible.map((p, i) => (
            <ProductCard key={p.id} product={p} delay={i * 50} />
          ))}
        </div>

        {!isLoading && visible.length === 0 && (
          <p className="mt-10 text-center text-sm text-mut">
            {t("shop.empty")}{" "}
            <Link to="/shop" search={{}} className="text-accent">
              {t("shop.all")}
            </Link>
          </p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
