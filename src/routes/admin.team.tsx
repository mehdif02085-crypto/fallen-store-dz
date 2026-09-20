import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, ShieldCheck, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminRequestsQuery,
  adminStatusQuery,
  adminsQuery,
  friendlyAdminError,
  REQUEST_STATUS_LABEL,
} from "@/lib/admin";

export const Route = createFileRoute("/admin/team")({
  component: AdminTeam,
});

function fmtDate(v: string) {
  return new Date(v).toLocaleString("fr-DZ", { dateStyle: "medium", timeStyle: "short" });
}

function AdminTeam() {
  const queryClient = useQueryClient();
  const { data: status } = useQuery(adminStatusQuery);
  const { data: requests = [] } = useQuery(adminRequestsQuery);
  const { data: admins = [] } = useQuery(adminsQuery);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const isSuper = status?.is_super_admin === true;

  function refresh(text: string) {
    setError(null);
    setMsg(text);
    void queryClient.invalidateQueries({ queryKey: ["admin_requests"] });
    void queryClient.invalidateQueries({ queryKey: ["admins"] });
    void queryClient.invalidateQueries({ queryKey: ["admin_audit_log"] });
    window.setTimeout(() => setMsg(null), 2500);
  }

  const decide = useMutation({
    mutationFn: async (v: { id: string; approve: boolean }) => {
      const { error: e } = v.approve
        ? await supabase.rpc("approve_admin_request", { p_request_id: v.id })
        : await supabase.rpc("reject_admin_request", { p_request_id: v.id });
      if (e) throw new Error(friendlyAdminError(e.message));
    },
    onSuccess: (_d, v) => refresh(v.approve ? "Accès accordé." : "Demande refusée."),
    onError: (e: Error) => {
      setMsg(null);
      setError(e.message);
    },
  });

  const revoke = useMutation({
    mutationFn: async (userId: string) => {
      const { error: e } = await supabase.rpc("revoke_admin_access", { p_user_id: userId });
      if (e) throw new Error(friendlyAdminError(e.message));
    },
    onSuccess: () => refresh("Accès retiré."),
    onError: (e: Error) => {
      setMsg(null);
      setError(e.message);
    },
  });

  const pending = requests.filter((r) => r.status === "pending");
  const history = requests.filter((r) => r.status !== "pending");

  return (
    <div>
      <h1 className="font-display text-2xl leading-none">Administrateurs</h1>
      {!isSuper && (
        <p className="mt-2 text-xs text-mut">
          Seul le super administrateur peut approuver, refuser ou retirer un accès.
        </p>
      )}
      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {msg && <p className="mt-3 text-xs text-accent">{msg}</p>}

      <section className="mt-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-mut">
          Demandes en attente ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 text-sm text-mut">Aucune demande en attente.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="rounded-2xl glass p-4">
                <p className="text-sm font-semibold">{r.full_name ?? "Nom non renseigné"}</p>
                <p className="text-xs text-mut" dir="ltr">
                  {r.email}
                </p>
                <p className="mt-1 text-xs text-mut">Demande du {fmtDate(r.created_at)}</p>
                {r.message && <p className="mt-2 text-xs">{r.message}</p>}
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-accent">
                  {REQUEST_STATUS_LABEL[r.status]}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={!isSuper || decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, approve: true })}
                    className="btn-primary flex-1 justify-center disabled:opacity-40"
                  >
                    <Check className="size-4" /> Approuver
                  </button>
                  <button
                    type="button"
                    disabled={!isSuper || decide.isPending}
                    onClick={() => decide.mutate({ id: r.id, approve: false })}
                    className="btn-ghost flex-1 justify-center disabled:opacity-40"
                  >
                    <X className="size-4" /> Refuser
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-mut">
          Équipe administrateur ({admins.length})
        </h2>
        <ul className="mt-3 space-y-2">
          {admins.map((a) => (
            <li key={`${a.user_id}-${a.role}`} className="flex items-center gap-3 rounded-2xl glass p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" dir="ltr">
                  {a.email}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-mut">
                  {a.is_super && <ShieldCheck className="size-3.5 text-accent" />}
                  {a.is_super ? "Super administrateur" : "Administrateur"} · depuis {fmtDate(a.granted_at)}
                </p>
              </div>
              {!a.is_super && (
                <button
                  type="button"
                  disabled={!isSuper || revoke.isPending}
                  onClick={() => revoke.mutate(a.user_id)}
                  className="btn-ghost ms-auto shrink-0 disabled:opacity-40"
                >
                  <Trash2 className="size-4" /> Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-mut">Historique des demandes</h2>
          <ul className="mt-3 space-y-2">
            {history.map((r) => (
              <li key={r.id} className="rounded-2xl bg-ink/5 p-3 text-xs">
                <span dir="ltr">{r.email}</span> · {REQUEST_STATUS_LABEL[r.status]} ·{" "}
                {fmtDate(r.decided_at ?? r.created_at)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
