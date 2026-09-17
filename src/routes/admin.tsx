import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Wordmark } from "@/components/site-header";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const { data: isAdmin } = await supabase.rpc("is_admin");
    if (!isAdmin) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  head: () => ({
    meta: [
      { title: "Tableau de bord | Fallen Store" },
      { name: "description", content: "Administration de la boutique Fallen Store." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Tableau de bord | Fallen Store" },
      { property: "og:description", content: "Administration Fallen Store." },
    ],
  }),
  component: AdminLayout,
});

const LINKS = [
  { to: "/admin", label: "Commandes", exact: true },
  { to: "/admin/products", label: "Produits", exact: false },
  { to: "/admin/designs", label: "Personnalisations", exact: false },
  { to: "/admin/settings", label: "Réglages", exact: false },
] as const;

function AdminLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3">
          <Link to="/">
            <Wordmark />
          </Link>
          <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent-foreground">
            Admin
          </span>
          <button
            type="button"
            onClick={() => void signOut()}
            className="ms-auto flex items-center gap-1.5 text-xs text-mut hover:text-ink"
          >
            <LogOut className="size-3.5" /> Déconnexion
          </button>
        </div>
        <nav className="no-scrollbar mx-auto flex max-w-6xl gap-1.5 overflow-x-auto px-5 pb-3">
          {LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.exact }}
              activeProps={{ className: "bg-ink text-canvas" }}
              inactiveProps={{ className: "bg-ink/5" }}
              className="shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-6">
        <Outlet />
      </main>
    </div>
  );
}
