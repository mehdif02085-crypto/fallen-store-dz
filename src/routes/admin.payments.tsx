import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaymentIntegrations } from "@/lib/payments.functions";
import { paymentMethodsQuery } from "@/lib/queries";
import type { IntegrationState, ProviderIntegration } from "@/lib/payments/types";

export const Route = createFileRoute("/admin/payments")({
  ssr: false,
  component: AdminPayments,
});

const STATE_LABEL: Record<IntegrationState, string> = {
  configured: "Configuré",
  missing_credentials: "Identifiants manquants",
  not_configured: "Non configuré",
  manual: "Manuel (aucune API)",
};

function StateChip({ state }: { state: IntegrationState }) {
  const tone =
    state === "configured"
      ? "bg-accent text-accent-foreground"
      : state === "manual"
        ? "bg-ink/10 text-ink"
        : "bg-danger/15 text-danger";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tone}`}>
      {STATE_LABEL[state]}
    </span>
  );
}

function AdminPayments() {
  const fetchIntegrations = useServerFn(getPaymentIntegrations);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data: integrations = [], isLoading } = useQuery<ProviderIntegration[]>({
    queryKey: ["payment_integrations"],
    queryFn: () => fetchIntegrations(),
  });
  const { data: methods = [] } = useQuery(paymentMethodsQuery);

  const byKey = new Map(integrations.map((i) => [i.key, i]));

  async function toggle(code: string, next: boolean, providerKey: string) {
    const integ = byKey.get(providerKey as ProviderIntegration["key"]);
    if (next && integ && (integ.state === "not_configured" || integ.state === "missing_credentials")) {
      setNotice(
        `Impossible d'activer ${code.toUpperCase()} : identifiants manquants (${integ.missingEnv.join(", ")}).`,
      );
      return;
    }
    setNotice(null);
    setBusy(code);
    const { error } = await supabase.from("payment_methods").update({ is_enabled: next }).eq("code", code);
    setBusy(null);
    if (error) setNotice(error.message);
    else await queryClient.invalidateQueries({ queryKey: ["payment_methods"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl leading-none">Paiements</h1>
        <p className="mt-1 text-xs text-mut">
          État des intégrations. Les clés secrètes ne sont jamais affichées : seuls les noms des
          variables d'environnement requises apparaissent ici.
        </p>
      </div>

      {notice && <p className="rounded-2xl glass p-3 text-xs text-danger">{notice}</p>}

      <section className="space-y-3">
        {isLoading && <p className="text-xs text-mut">Chargement…</p>}
        {integrations.map((i) => (
          <article key={i.key} className="rounded-2xl glass p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-lg leading-none">{i.label}</h2>
              <StateChip state={i.state} />
              {i.mode !== "n/a" && (
                <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-mut">
                  {i.mode === "production" ? "Production" : "Test"}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-mut">{i.notes}</p>

            {i.requiredEnv.length > 0 && (
              <dl className="mt-3 space-y-1 text-[11px]">
                <dt className="uppercase tracking-widest text-mut">Variables requises</dt>
                {i.requiredEnv.map((name) => (
                  <dd key={name} className="flex items-center gap-2 font-mono">
                    <span>{name}</span>
                    <span className={i.missingEnv.includes(name) ? "text-danger" : "text-accent"}>
                      {i.missingEnv.includes(name) ? "manquante" : "présente"}
                    </span>
                  </dd>
                ))}
              </dl>
            )}

            {i.webhookPath && (
              <p className="mt-3 break-all text-[11px] text-mut">
                Webhook à enregistrer chez le fournisseur :{" "}
                <span className="font-mono text-ink">
                  https://fallen-store-dz.lovable.app{i.webhookPath}
                </span>
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {methods
                .filter((m) => i.methods.includes(m.code))
                .map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    disabled={busy === m.code}
                    onClick={() => void toggle(m.code, !m.is_enabled, i.key)}
                    className={`chip ${m.is_enabled ? "chip-active" : ""}`}
                  >
                    {m.name_fr} · {m.is_enabled ? "activé" : "désactivé"}
                  </button>
                ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
