import { createFileRoute, Link } from "@tanstack/react-router";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact & FAQ — livraison et retours | Fallen Store" },
      {
        name: "description",
        content:
          "Contactez Fallen Store et consultez la FAQ : délais de livraison en Algérie, paiement à la livraison, tailles, échanges et commandes personnalisées.",
      },
      { property: "og:title", content: "Contact & FAQ | Fallen Store" },
      {
        property: "og:description",
        content: "Livraison, paiement, tailles et personnalisation — toutes les réponses.",
      },
    ],
  }),
  component: Contact,
});

const FAQ_FR = [
  {
    q: "Livrez-vous dans toute l'Algérie ?",
    a: "Oui, nous livrons dans les 58 wilayas. Les frais varient selon la wilaya et s'affichent au moment de la commande.",
  },
  {
    q: "Quels moyens de paiement acceptez-vous ?",
    a: "Le paiement à la livraison est disponible dès maintenant. Le paiement en ligne (CIB, Edahabia, carte) apparaîtra dès que la boutique l'activera.",
  },
  {
    q: "Combien de temps prend la livraison ?",
    a: "Préparation sous 48h, puis 2 à 5 jours selon la wilaya.",
  },
  {
    q: "Comment choisir ma taille ?",
    a: "Nos coupes sont oversized. Si vous hésitez entre deux tailles, prenez la plus petite pour un fit régulier.",
  },
  {
    q: "Le t-shirt personnalisé coûte-t-il plus cher ?",
    a: "Oui, le prix des articles personnalisés est défini par la boutique et peut différer des produits standards. Le total exact s'affiche avant l'ajout au panier.",
  },
  {
    q: "Puis-je échanger un article ?",
    a: "Un échange de taille est possible sous 7 jours, article non porté et étiquette intacte.",
  },
];

const FAQ_AR = [
  {
    q: "هل توصلون إلى كل الجزائر؟",
    a: "نعم، نوصل إلى 58 ولاية. تختلف تكلفة التوصيل حسب الولاية وتظهر عند إتمام الطلب.",
  },
  {
    q: "ما هي طرق الدفع المتوفرة؟",
    a: "الدفع عند الاستلام متوفر حاليا. الدفع الإلكتروني (CIB، الذهبية، البطاقة) سيظهر بمجرد تفعيله من طرف المتجر.",
  },
  { q: "كم يستغرق التوصيل؟", a: "التحضير خلال 48 ساعة ثم من 2 إلى 5 أيام حسب الولاية." },
  {
    q: "كيف أختار مقاسي؟",
    a: "قصاتنا واسعة. إذا كنت بين مقاسين، اختر الأصغر للحصول على قصة عادية.",
  },
  {
    q: "هل التيشيرت المخصص أغلى؟",
    a: "نعم، سعر المنتجات المخصصة يحدده المتجر وقد يختلف عن المنتجات العادية. يظهر المجموع قبل الإضافة إلى السلة.",
  },
  { q: "هل يمكنني تبديل منتج؟", a: "تبديل المقاس ممكن خلال 7 أيام، بشرط عدم الاستعمال." },
];

function Contact() {
  const { t, lang } = useI18n();
  const faq = lang === "ar" ? FAQ_AR : FAQ_FR;

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pt-6">
        <h1 className="font-display text-4xl leading-none">{t("contact.title")}</h1>

        <section className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl glass p-4">
            <p className="label">{t("contact.reach")}</p>
            <a href="tel:+213555000000" className="flex items-center gap-2 text-sm" dir="ltr">
              <Phone className="size-4 text-accent" /> +213 555 00 00 00
            </a>
            <a
              href="mailto:contact@fallenstore.dz"
              className="mt-2 flex items-center gap-2 text-sm"
              dir="ltr"
            >
              <Mail className="size-4 text-accent" /> contact@fallenstore.dz
            </a>
            <a
              href="https://instagram.com/fallenstore.dz"
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-2 text-sm"
              dir="ltr"
            >
              <Instagram className="size-4 text-accent" /> @fallenstore.dz
            </a>
          </div>
          <div className="rounded-2xl glass p-4">
            <p className="label">{lang === "ar" ? "المتجر" : "Atelier"}</p>
            <p className="flex items-start gap-2 text-sm text-mut">
              <MapPin className="mt-0.5 size-4 shrink-0 text-accent" />
              {lang === "ar"
                ? "الجزائر العاصمة — استلام بموعد مسبق."
                : "Alger centre — retrait sur rendez-vous."}
            </p>
            <p className="mt-2 text-xs text-mut">
              {lang === "ar" ? "من السبت إلى الخميس، 10:00 – 18:00" : "Sam – Jeu, 10h – 18h"}
            </p>
          </div>
        </section>

        <section className="pt-8">
          <h2 className="font-display text-2xl leading-none">{t("contact.faq")}</h2>
          <div className="mt-4 space-y-2">
            {faq.map((f) => (
              <details key={f.q} className="rounded-2xl glass p-4">
                <summary className="cursor-pointer text-sm font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-mut">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <Link to="/shop" className="btn-primary mt-6 w-full">
          {t("nav.shop")}
        </Link>
      </main>
      <SiteFooter />
    </div>
  );
}
