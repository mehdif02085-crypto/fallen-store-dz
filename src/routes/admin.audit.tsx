import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ACTION_LABEL, adminStatusQuery, auditQuery } from "@/lib/admin";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAudit,
});

function AdminAudit() {
  const { data: status } = useQuery(adminStatusQuery);
  const { data: rows = [], error } = useQuery({
    ...auditQuery,
    enabled: status?.is_super_admin === true,
  });

  if (status && !status.is_super_admin) {
    return (
      <div>
        <h1 className="font-display text-2xl leading-none">Journal</h1>
        <p className="mt-3 text-sm text-mut">
          Le journal des changements de rôles est réservé au super administrateur.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl leading-none">Journal</h1>
      <p className="mt-2 text-xs text-mut">
        Toutes les demandes, approbations, refus et retraits d'accès administrateur.
      </p>
      {error && <p className="mt-3 text-xs text-danger">{error.message}</p>}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-mut">Aucune activité enregistrée.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl glass p-3">
              <p className="text-sm font-semibold">{ACTION_LABEL[r.action] ?? r.action}</p>
              <p className="mt-1 text-xs text-mut" dir="ltr">
                {r.actor_email ?? "système"} → {r.target_email ?? "—"}
              </p>
              <p className="mt-1 text-[11px] text-mut">
                {new Date(r.created_at).toLocaleString("fr-DZ", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
