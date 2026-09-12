import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Wordmark } from "@/components/site-header";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="px-5 pb-12 pt-10">
      <div className="mx-auto max-w-6xl rounded-2xl glass p-5">
        <div className="flex items-center justify-between">
          <Wordmark className="text-2xl" />
          <a
            href="https://instagram.com"
            target="_blank"
            rel="noreferrer noopener"
            className="grid size-9 place-items-center rounded-full glass text-mut"
            aria-label="Instagram"
          >
            <Instagram className="size-4" />
          </a>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-xs text-mut">
          <div className="space-y-2">
            <p className="font-semibold text-ink">{t("footer.shop")}</p>
            <Link to="/shop" className="block hover:text-ink">
              {t("nav.shop")}
            </Link>
            <Link to="/categories" className="block hover:text-ink">
              {t("nav.categories")}
            </Link>
            <Link to="/custom" className="block text-accent">
              {t("nav.custom")}
            </Link>
          </div>
          <div className="space-y-2">
            <p className="font-semibold text-ink">{t("footer.help")}</p>
            <Link to="/contact" className="block hover:text-ink">
              {t("nav.contact")}
            </Link>
            <Link to="/order" className="block hover:text-ink">
              {t("confirm.lookup")}
            </Link>
            <Link to="/auth" className="block hover:text-ink">
              {t("nav.admin")}
            </Link>
          </div>
        </div>
        <p className="mt-5 border-t border-line pt-4 text-[11px] text-mut">
          © {new Date().getFullYear()} Fallen Store — Alger, DZ. {t("footer.rights")}.
        </p>
      </div>
    </footer>
  );
}
