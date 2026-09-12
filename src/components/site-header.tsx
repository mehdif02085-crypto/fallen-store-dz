import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display leading-none ${className}`}>
      FALLEN<span className="text-accent">.</span>
    </span>
  );
}

function LangSwitch() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex glass rounded-full p-0.5 text-[11px] font-semibold">
      <button
        type="button"
        onClick={() => setLang("fr")}
        className={`px-2.5 py-1 rounded-full ${lang === "fr" ? "bg-ink text-canvas" : "text-mut"}`}
      >
        FR
      </button>
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={`px-2.5 py-1 rounded-full font-ar ${lang === "ar" ? "bg-ink text-canvas" : "text-mut"}`}
      >
        ع
      </button>
    </div>
  );
}

export function SiteHeader({ transparent = false }: { transparent?: boolean }) {
  const { t } = useI18n();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  const links = [
    { to: "/", label: t("nav.home") },
    { to: "/shop", label: t("nav.shop") },
    { to: "/categories", label: t("nav.categories") },
    { to: "/custom", label: t("nav.custom") },
    { to: "/contact", label: t("nav.contact") },
  ] as const;

  return (
    <header
      className={`sticky top-0 z-50 ${transparent ? "" : "glass"} px-5 py-3.5`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={t("nav.shop")}
            onClick={() => setOpen((v) => !v)}
            className="grid size-9 place-items-center rounded-full glass md:hidden"
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
          <Link to="/" className="text-2xl">
            <Wordmark />
          </Link>
        </div>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.slice(1).map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-mut transition-colors hover:text-ink"
              activeProps={{ className: "text-ink" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangSwitch />
          <Link
            to="/cart"
            aria-label={t("nav.cart")}
            className="relative grid size-9 place-items-center rounded-full glass"
          >
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -end-1 -top-1 grid size-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {open && (
        <nav className="mx-auto mt-3 grid max-w-6xl gap-1 rise md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              className="rounded-xl glass px-4 py-3 text-sm font-semibold"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
