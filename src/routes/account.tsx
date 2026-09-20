import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { adminStatusQuery, friendlyAdminError, REQUEST_STATUS_LABEL } from "@/lib/admin";

export const Route = createFileRoute("/account")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Mon compte | Fallen Store" },
      {
        name: "description",
        content:
          "Espace membre Fallen Store : suivez votre statut et demandez un accès administrateur à la boutique.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Mon compte | Fallen Store" },
      { property: "og:description", content: "Espace membre Fallen Store." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState(false);
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        void navigate({ to: "/auth", replace: true });
        return;
      }
      setChecked(true);
    })();
  }, [navigate]);

  const { data: status } = useQuery({ ...adminStatusQuery, enabled: checked });

  const request = useMutation({
    mutationFn: async () => {
      const { error: e } = await supabase.rpc("request_admin_access", {
        p_full_name: fullName.trim() || undefined,
        p_message: message.trim() || undefined,
      });
      if (e) throw new Error(friendlyAdminError(e.message));
    },
    onSuccess: () => {
      setError(null);
      setOk("Demande envoyée. Le super administrateur va l'examiner.");
      void queryClient.invalidateQueries({ queryKey: ["admin_status"] });
    },
    onError: (e: Error) => {
      setOk(null);
      setError(e.message);
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  const pending = status?.request_status === "pending";

  return (
    <div className="min-h-screen bg-canvas">
      <SiteHeader />
      <main className="mx-auto max-w-lg px-5 pt-10 pb-16">
        <h1 className="font-display text-3xl leading-none">Mon compte</h1>
        {status?.email && (
          <p className="mt-2 text-xs text-mut" dir="ltr">
            {status.email}
          </p>
        )}

        {status?.is_admin ? (
          <div className="mt-6 rounded-2xl glass p-4">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-accent" />
              {status.is_super_admin ? "Super administrateur" : "Administrateur"}
            </p>
            <Link to="/admin" className="btn-primary mt-4 w-full text-center">
              Ouvrir le tableau de bord
            </Link>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl glass p-4">
            <p className="text-sm font-semibold">Accès administrateur</p>
            <p className="mt-1 text-xs text-mut">
              Aucun compte ne devient administrateur automatiquement. Envoyez une demande : le super
              administrateur l'approuve ou la refuse.
            </p>
            {pending ? (
              <p className="mt-4 rounded-xl bg-ink/5 p-3 text-xs">
                Statut de votre demande : <strong>En attente</strong>
              </p>
            ) : (
              <form
                className="mt-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  request.mutate();
                }}
              >
                <label className="label" htmlFor="fullName">
                  Nom complet
                </label>
                <input
                  id="fullName"
                  className="field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  minLength={3}
                  maxLength={120}
                />
                <label className="label mt-3" htmlFor="msg">
                  Motif (facultatif)
                </label>
                <textarea
                  id="msg"
                  className="field min-h-20"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={500}
                />
                <button type="submit" disabled={request.isPending} className="btn-primary mt-4 w-full">
                  Demander un accès administrateur
                </button>
              </form>
            )}
            {status?.request_status && !pending && (
              <p className="mt-3 text-xs text-mut">
                Dernière demande : {REQUEST_STATUS_LABEL[status.request_status]}
              </p>
            )}
            {error && <p className="mt-3 text-xs text-danger">{error}</p>}
            {ok && <p className="mt-3 text-xs text-accent">{ok}</p>}
          </div>
        )}

        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-6 w-full text-center text-xs text-mut hover:text-ink"
        >
          Déconnexion
        </button>
      </main>
      <SiteFooter />
    </div>
  );
}
