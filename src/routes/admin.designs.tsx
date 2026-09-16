import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Img } from "@/components/img";
import { storageRef } from "@/lib/image";
import { formatDA } from "@/lib/format";

export const Route = createFileRoute("/admin/designs")({
  component: AdminDesigns,
});

type DesignRow = {
  id: string;
  shirt_model: string;
  shirt_color_name: string;
  shirt_color_hex: string;
  size: string;
  design_image_url: string | null;
  custom_text: string | null;
  text_color: string | null;
  position: string;
  price_da: number;
  created_at: string;
  order_items: {
    quantity: number;
    orders: { order_number: string; customer_name: string; phone: string; status: string } | null;
  }[];
};

function AdminDesigns() {
  const { data: designs = [], isLoading } = useQuery({
    queryKey: ["admin", "designs"],
    queryFn: async (): Promise<DesignRow[]> => {
      const { data, error } = await supabase
        .from("custom_designs")
        .select(
          "*, order_items(quantity, orders(order_number,customer_name,phone,status))",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DesignRow[];
    },
  });

  return (
    <div>
      <h1 className="font-display text-3xl leading-none">Personnalisations</h1>
      <p className="mt-2 text-sm text-mut">
        Designs envoyés par les clients, avec le visuel à imprimer et la commande liée.
      </p>

      {isLoading && <p className="mt-6 text-sm text-mut">Chargement…</p>}
      {!isLoading && designs.length === 0 && (
        <p className="mt-6 text-sm text-mut">Aucune commande personnalisée pour l'instant.</p>
      )}

      <ul className="mt-5 grid gap-3 sm:grid-cols-2">
        {designs.map((d) => {
          const order = d.order_items[0]?.orders ?? null;
          return (
            <li key={d.id} className="rounded-2xl glass p-4">
              <div className="flex gap-3">
                <div
                  className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-xl"
                  style={{ backgroundColor: d.shirt_color_hex }}
                >
                  {d.design_image_url ? (
                    <Img
                      src={storageRef("custom-designs", d.design_image_url)}
                      alt="Design client"
                      className="size-full object-contain"
                      width={192}
                      height={192}
                    />
                  ) : (
                    <span
                      className="font-display text-center text-sm"
                      style={{ color: d.text_color ?? undefined }}
                    >
                      {d.custom_text ?? "—"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 text-xs">
                  <p className="text-sm font-semibold uppercase">{d.shirt_model}</p>
                  <p className="mt-0.5 text-mut">
                    {d.shirt_color_name} · {d.size} · position : {d.position}
                  </p>
                  {d.custom_text && <p className="mt-0.5 text-mut">Texte : “{d.custom_text}”</p>}
                  <p className="mt-0.5 text-mut">{formatDA(d.price_da)} DA</p>
                  {order && (
                    <p className="mt-1 text-mut">
                      <span dir="ltr">{order.order_number}</span> — {order.customer_name} ·{" "}
                      {order.phone}
                    </p>
                  )}
                </div>
              </div>
              {d.design_image_url && (
                <button
                  type="button"
                  onClick={() => {
                    void (async () => {
                      const { data } = await supabase.storage
                        .from("custom-designs")
                        .createSignedUrl(d.design_image_url!, 60 * 10, { download: true });
                      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
                    })();
                  }}
                  className="mt-3 rounded-xl bg-ink/5 px-3 py-1.5 text-xs font-semibold"
                >
                  Télécharger le visuel
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
