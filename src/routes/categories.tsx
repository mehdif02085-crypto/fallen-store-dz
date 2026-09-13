import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/lib/i18n";
import { categoriesQuery, mainImage, productsQuery } from "@/lib/queries";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Catégories — T-shirts, hoodies, pantalons | Fallen Store" },
      {
        name: "description",
        content:
          "Parcourez les catégories Fallen Store : t-shirts, oversized, hoodies, sweatshirts, pantalons, accessoires, nouveautés et soldes.",
      },
      { property: "og:title", content: "Catégories | Fallen Store" },
      {
        property: "og:description",
        content: "Toutes les catégories de la boutique streetwear Fallen Store.",
      },
    ],
  }),
  component: Categories,
});

function Categories() {
  const { t, lang } = useI18n();
  const { data: categories = [] } = useQuery(categoriesQuery);
  const { data: products = [] } = useQuery(productsQuery);

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 pb-6 pt-6">
        <h1 className="font-display text-4xl leading-none">{t("home.categories")}</h1>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {categories.map((c, i) => {
            const inCat = products.filter((p) => p.categories?.slug === c.slug);
            const cover = inCat[0] ? mainImage(inCat[0]) : null;
            return (
              <Link
                key={c.id}
                to="/shop"
                search={{ category: c.slug }}
                className="overflow-hidden rounded-2xl glass rise"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="aspect-square bg-panel">
                  {cover && (
                    <img
                      src={cover}
                      alt={lang === "ar" ? c.name_ar : c.name_fr}
                      loading="lazy"
                      width={1024}
                      height={1024}
                      className="size-full object-cover"
                    />
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold uppercase">
                    {lang === "ar" ? c.name_ar : c.name_fr}
                  </p>
                  <p className="mt-0.5 text-[11px] text-mut">
                    {inCat.length} {lang === "ar" ? "منتج" : "produits"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Link to="/shop" search={{}} className="rounded-2xl glass p-5">
            <p className="font-display text-2xl">{t("shop.new")}</p>
            <p className="mt-1 text-xs text-mut">{t("home.viewAll")}</p>
          </Link>
          <Link to="/shop" search={{ sale: true }} className="rounded-2xl glass p-5">
            <p className="font-display text-2xl text-accent">{t("shop.sale")}</p>
            <p className="mt-1 text-xs text-mut">{t("home.viewAll")}</p>
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
