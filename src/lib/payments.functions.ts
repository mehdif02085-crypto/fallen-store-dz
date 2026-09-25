import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { ProviderIntegration, StartPaymentResult } from "./payments/types";

const ORIGIN_RE = /^https?:\/\/[a-z0-9.-]+(:\d{2,5})?$/i;

function safeOrigin(origin: string): string {
  const fallback = process.env["SITE_URL"] ?? "https://fallen-store-dz.lovable.app";
  if (!ORIGIN_RE.test(origin)) return fallback;
  try {
    const host = new URL(origin).hostname;
    const allowed =
      host === "localhost" ||
      host.endsWith(".lovable.app") ||
      host === new URL(fallback).hostname ||
      host.endsWith(".fallenstore.dz") ||
      host === "fallenstore.dz";
    return allowed ? origin : fallback;
  } catch {
    return fallback;
  }
}

/** Starts an online payment for an existing order. Prices come from the database only. */
export const startPayment = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        orderNumber: z.string().min(4).max(40),
        phone: z.string().min(9).max(20),
        origin: z.string().max(200).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<StartPaymentResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { providerForMethod, ProviderNotConfigured } = await import("./payments/providers.server");

    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("order_number, phone, total_da, payment_method, payment_status, customer_name")
      .eq("order_number", data.orderNumber)
      .eq("phone", data.phone)
      .maybeSingle();

    if (error || !order) {
      return { ok: false, reason: "ERROR", message: "Commande introuvable." };
    }
    if (order.payment_status === "paid") {
      return { ok: false, reason: "ALREADY_PAID", message: "Cette commande est déjà payée." };
    }

    const { data: method } = await supabaseAdmin
      .from("payment_methods")
      .select("code, provider_key, is_enabled, is_online")
      .eq("code", order.payment_method)
      .maybeSingle();

    if (!method || !method.is_enabled) {
      return { ok: false, reason: "NOT_CONFIGURED", message: "Ce moyen de paiement est indisponible." };
    }
    if (!method.is_online) {
      return {
        ok: false,
        reason: "MANUAL",
        message: "Ce paiement est confirmé manuellement par le magasin.",
      };
    }

    const provider = providerForMethod(method.code, method.provider_key);
    if (!provider) {
      return { ok: false, reason: "NOT_CONFIGURED", message: "Fournisseur de paiement inconnu." };
    }

    const origin = safeOrigin(data.origin);
    const returnBase = `${origin}/order?number=${encodeURIComponent(order.order_number)}&phone=${encodeURIComponent(order.phone)}`;

    try {
      const session = await provider.createCheckout({
        orderNumber: order.order_number,
        amountDa: order.total_da,
        methodCode: method.code,
        customerName: order.customer_name,
        phone: order.phone,
        successUrl: `${returnBase}&pay=success`,
        failureUrl: `${returnBase}&pay=failed`,
      });

      const { error: attachError } = await supabaseAdmin.rpc("attach_payment_intent", {
        p_order_number: order.order_number,
        p_provider: provider.key,
        p_provider_ref: session.providerRef,
        p_checkout_url: session.checkoutUrl,
        p_mode: session.mode,
      });
      if (attachError) throw new Error(attachError.message);

      return { ok: true, redirectUrl: session.checkoutUrl, mode: session.mode };
    } catch (err) {
      if (err instanceof ProviderNotConfigured) {
        return {
          ok: false,
          reason: "NOT_CONFIGURED",
          message:
            "Ce moyen de paiement n'est pas encore connecté (identifiants marchands manquants).",
        };
      }
      console.error("startPayment failed", err);
      return {
        ok: false,
        reason: "ERROR",
        message: "Le paiement en ligne est momentanément indisponible. Réessayez ou choisissez le paiement à la livraison.",
      };
    }
  });

/** Admin-only integration status. Returns variable NAMES only — never secret values. */
export const getPaymentIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProviderIntegration[]> => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("FORBIDDEN");
    const { integrationStatus } = await import("./payments/providers.server");
    return integrationStatus();
  });

/**
 * Re-checks a pending payment with the provider (used by the confirmation page).
 * SATIM does not push webhooks, so its result is pulled back from the bank here.
 */
export const syncPaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ orderNumber: z.string().min(4).max(40), phone: z.string().min(9).max(20) })
      .parse(data),
  )
  .handler(async ({ data }): Promise<{ payment_status: string; status: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { PROVIDERS } = await import("./payments/providers.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, phone, payment_status, status")
      .eq("order_number", data.orderNumber)
      .eq("phone", data.phone)
      .maybeSingle();
    if (!order) throw new Error("ORDER_NOT_FOUND");

    if (order.payment_status === "pending") {
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("provider, provider_ref")
        .eq("order_id", order.id)
        .maybeSingle();

      if (payment?.provider === "satim" && payment.provider_ref) {
        const verdict = await PROVIDERS.satim.confirmOrder(payment.provider_ref);
        if (verdict && verdict.result !== "pending") {
          await supabaseAdmin.rpc("confirm_payment", {
            p_provider: "satim",
            p_provider_ref: verdict.providerRef,
            p_event_id: verdict.eventId,
            p_result: verdict.result,
            p_payload: { type: verdict.eventType },
            ...(typeof verdict.amountDa === "number" ? { p_amount_da: verdict.amountDa } : {}),
            ...(verdict.reason ? { p_reason: verdict.reason } : {}),
          });

        }

      }
    }

    const { data: fresh } = await supabaseAdmin
      .from("orders")
      .select("payment_status, status")
      .eq("id", order.id)
      .single();

    return { payment_status: fresh?.payment_status ?? order.payment_status, status: fresh?.status ?? order.status };
  });
