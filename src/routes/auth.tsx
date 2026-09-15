import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Espace administrateur | Fallen Store" },
      {
        name: "description",
        content:
          "Connexion réservée à l'équipe Fallen Store pour gérer les produits, les prix et les commandes.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Espace administrateur | Fallen Store" },
      { property: "og:description", content: "Connexion équipe Fallen Store." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (isAdmin) void navigate({ to: "/admin" });
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);

    if (mode === "signup") {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` },
      });
      setBusy(false);
      if (signUpError) {
        setError(signUpError.message);
        return;
      }
      setInfo(
        "Compte créé. Confirmez votre e-mail, puis demandez au propriétaire de la boutique de vous accorder les droits administrateur.",
      );
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setBusy(false);
      setError(signInError.message);
      return;
    }
    const { data: isAdmin } = await supabase.rpc("is_admin");
    setBusy(false);
    if (!isAdmin) {
      setError(t("auth.noAccess"));
      return;
    }
    void navigate({ to: "/admin" });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-md px-5 pt-10">
        <h1 className="font-display text-3xl leading-none">{t("auth.title")}</h1>
        <form onSubmit={submit} className="mt-6 rounded-2xl glass p-4">
          <label className="label" htmlFor="email">
            {t("auth.email")}
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
            dir="ltr"
          />
          <label className="label mt-3" htmlFor="password">
            {t("auth.password")}
          </label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
            dir="ltr"
          />
          {error && <p className="mt-3 text-xs text-danger">{error}</p>}
          {info && <p className="mt-3 text-xs text-mut">{info}</p>}
          <button type="submit" disabled={busy} className="btn-primary mt-4 w-full">
            {mode === "signin" ? t("auth.signin") : t("auth.signup")}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
              setInfo(null);
            }}
            className="mt-3 w-full text-center text-xs text-mut hover:text-ink"
          >
            {mode === "signin" ? t("auth.signup") : t("auth.signin")}
          </button>
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}
