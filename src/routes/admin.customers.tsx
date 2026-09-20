import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { customersQuery } from "@/lib/admin";
import { formatDA } from "@/lib/format";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

function AdminCustomers() {
  const { data: rows = [], error } = useQuery(customersQuery);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      [r.email, r.full_name ?? "", r.phone ?? ""].some((v) => v.toLowerCase().includes(s)),
    );
  }, [rows, q]);

  return (
    <div>
      <h1 className="font-display text-2xl leading-none">Clients</h1>
      <input
        className="field mt-4"
        placeholder="Rechercher par e-mail, nom ou téléphone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="mt-3 text-xs text-danger">{error.message}</p>}
      {filtered.length === 0 ? (
        <p className="mt-4 text-sm text-mut">Aucun client trouvé.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {filtered.map((c) => (
            <li key={c.user_id} className="rounded-2xl glass p-4">
              <p className="text-sm font-semibold">{c.full_name ?? "Client"}</p>
              <p className="text-xs text-mut" dir="ltr">
                {c.email}
                {c.phone ? ` · ${c.phone}` : ""}
              </p>
              <p className="mt-1 text-xs text-mut">
                {c.orders_count} commande(s) · {formatDA(Number(c.total_spent_da))}
              </p>
              <p className="mt-1 text-[11px] text-mut">
                Inscrit le {new Date(c.created_at).toLocaleDateString("fr-DZ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
