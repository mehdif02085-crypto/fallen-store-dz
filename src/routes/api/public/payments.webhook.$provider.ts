import { createFileRoute } from "@tanstack/react-router";

/**
 * Payment provider webhook. The signature is verified with the provider's shared
 * secret before anything is written, results are deduplicated by event id, and
 * only the database decides the final order state.
 */
export const Route = createFileRoute("/api/public/payments/webhook/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const key = params.provider;
        const { PROVIDERS } = await import("@/lib/payments/providers.server");
        const provider = (PROVIDERS as unknown as Record<string, (typeof PROVIDERS)["chargily"]>)[
          key
        ];

        if (!provider) return new Response("Unknown provider", { status: 404 });

        const raw = await request.text();
        let verdict;
        try {
          verdict = provider.verifyWebhook(raw, request.headers);
        } catch {
          verdict = null;
        }
        if (!verdict) return new Response("Invalid signature", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.rpc("confirm_payment", {
          p_provider: provider.key,
          p_provider_ref: verdict.providerRef,
          p_event_id: verdict.eventId,
          p_result: verdict.result,
          p_payload: { type: verdict.eventType },
          ...(typeof verdict.amountDa === "number" ? { p_amount_da: verdict.amountDa } : {}),
          ...(verdict.reason ? { p_reason: verdict.reason } : {}),
        });


        if (error) {
          // Unknown reference: acknowledge so the provider stops retrying a payment we do not own.

          if (error.message.includes("PAYMENT_NOT_FOUND")) {
            return new Response("ignored", { status: 200 });
          }
          console.error("webhook confirm_payment failed", error.message);
          return new Response("retry", { status: 500 });
        }

        return Response.json({ received: true, result: data });
      },
    },
  },
});
