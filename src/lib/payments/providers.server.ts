// Server-only payment provider modules.
// Credentials are read from environment variables at call time and NEVER returned
// to the browser. No card data (number, CVV, PIN) is ever received or stored.
import { createHmac, timingSafeEqual } from "crypto";
import type { IntegrationMode, ProviderIntegration, ProviderKey } from "./types";

export type WebhookVerdict = {
  eventId: string;
  eventType: string;
  providerRef: string;
  result: "paid" | "failed" | "cancelled" | "expired" | "pending";
  amountDa: number | null;
  reason: string | null;
};

export type CheckoutRequest = {
  orderNumber: string;
  amountDa: number;
  methodCode: string; // cib | edahabia | card | baridimob | cod
  customerName: string;
  phone: string;
  successUrl: string;
  failureUrl: string;
};

export type CheckoutSession = {
  providerRef: string;
  checkoutUrl: string;
  mode: IntegrationMode;
};

export class ProviderNotConfigured extends Error {
  constructor(public missing: string[]) {
    super(`NOT_CONFIGURED:${missing.join(",")}`);
  }
}

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

function missingOf(names: string[]): string[] {
  return names.filter((n) => !env(n));
}

// ---------------------------------------------------------------- Chargily Pay
// Real, documented Algerian payment gateway (CIB + Edahabia) — https://dev.chargily.com
const CHARGILY_ENV = ["CHARGILY_SECRET_KEY", "CHARGILY_WEBHOOK_SECRET"];

function chargilyBase(): string {
  return env("CHARGILY_MODE") === "production"
    ? "https://pay.chargily.net/api/v2"
    : "https://pay.chargily.net/test/api/v2";
}

const chargily = {
  key: "chargily" as ProviderKey,
  label: "Chargily Pay (CIB / Edahabia)",
  methods: ["cib", "edahabia"],
  requiredEnv: CHARGILY_ENV,
  webhookPath: "/api/public/payments/webhook/chargily",
  notes:
    "Passerelle algérienne officielle pour CIB et Edahabia. Créez un compte marchand Chargily, puis fournissez la clé secrète et le secret de webhook.",

  mode(): IntegrationMode {
    return env("CHARGILY_MODE") === "production" ? "production" : "test";
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const missing = missingOf(CHARGILY_ENV);
    if (missing.length) throw new ProviderNotConfigured(missing);

    const res = await fetch(`${chargilyBase()}/checkouts`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${env("CHARGILY_SECRET_KEY")}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        amount: req.amountDa,
        currency: "dzd",
        payment_method: req.methodCode === "edahabia" ? "edahabia" : "cib",
        success_url: req.successUrl,
        failure_url: req.failureUrl,
        description: `Fallen Store ${req.orderNumber}`,
        metadata: [{ order_number: req.orderNumber }],
      }),
    });

    const body = (await res.json().catch(() => null)) as
      | { id?: string; checkout_url?: string; message?: string }
      | null;

    if (!res.ok || !body?.id || !body?.checkout_url) {
      throw new Error(`CHARGILY_ERROR:${res.status}:${body?.message ?? "unknown"}`);
    }
    return { providerRef: body.id, checkoutUrl: body.checkout_url, mode: chargily.mode() };
  },

  verifyWebhook(rawBody: string, headers: Headers): WebhookVerdict | null {
    const secret = env("CHARGILY_WEBHOOK_SECRET");
    const signature = headers.get("signature") ?? headers.get("x-signature");
    if (!secret || !signature) return null;

    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(signature, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    const event = JSON.parse(rawBody) as {
      id?: string;
      type?: string;
      data?: { id?: string; status?: string; amount?: number };
    };
    const ref = event.data?.id;
    if (!ref) return null;

    const type = event.type ?? "";
    const status = event.data?.status ?? "";
    const result: WebhookVerdict["result"] =
      type === "checkout.paid" || status === "paid"
        ? "paid"
        : type === "checkout.failed" || status === "failed"
          ? "failed"
          : status === "canceled" || status === "cancelled"
            ? "cancelled"
            : status === "expired"
              ? "expired"
              : "pending";

    return {
      eventId: event.id ?? `${ref}:${type}`,
      eventType: type || status || "unknown",
      providerRef: ref,
      result,
      amountDa: typeof event.data?.amount === "number" ? Math.round(event.data.amount) : null,
      reason: result === "paid" ? null : type || status || null,
    };
  },
};

// ------------------------------------------------------------- SATIM (direct)
// Direct SATIM/CIB e-payment gateway. Requires a merchant contract with a bank.
const SATIM_ENV = ["SATIM_GATEWAY_URL", "SATIM_USERNAME", "SATIM_PASSWORD", "SATIM_TERMINAL_ID"];

const satim = {
  key: "satim" as ProviderKey,
  label: "SATIM / CIB direct (contrat bancaire)",
  methods: ["card"],
  requiredEnv: SATIM_ENV,
  webhookPath: "/api/public/payments/webhook/satim",
  notes:
    "Passerelle bancaire directe SATIM. Nécessite un contrat marchand avec votre banque, l'URL de la passerelle, l'identifiant terminal et les identifiants API fournis par la banque.",

  mode(): IntegrationMode {
    return env("SATIM_MODE") === "production" ? "production" : "test";
  },

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const missing = missingOf(SATIM_ENV);
    if (missing.length) throw new ProviderNotConfigured(missing);

    // SATIM expects the amount in centimes and returns an order id + redirect form URL.
    const url = new URL(`${env("SATIM_GATEWAY_URL")!.replace(/\/$/, "")}/register.do`);
    url.searchParams.set("userName", env("SATIM_USERNAME")!);
    url.searchParams.set("password", env("SATIM_PASSWORD")!);
    url.searchParams.set("orderNumber", req.orderNumber.replace(/[^A-Za-z0-9]/g, ""));
    url.searchParams.set("amount", String(req.amountDa * 100));
    url.searchParams.set("currency", "012");
    url.searchParams.set("returnUrl", req.successUrl);
    url.searchParams.set("failUrl", req.failureUrl);
    url.searchParams.set("language", "fr");
    url.searchParams.set(
      "jsonParams",
      JSON.stringify({ force_terminal_id: env("SATIM_TERMINAL_ID"), udf1: req.orderNumber }),
    );

    const res = await fetch(url, { method: "GET" });
    const body = (await res.json().catch(() => null)) as
      | { orderId?: string; formUrl?: string; errorCode?: string; errorMessage?: string }
      | null;

    if (!res.ok || !body?.orderId || !body?.formUrl) {
      throw new Error(`SATIM_ERROR:${body?.errorCode ?? res.status}:${body?.errorMessage ?? "unknown"}`);
    }
    return { providerRef: body.orderId, checkoutUrl: body.formUrl, mode: satim.mode() };
  },

  /**
   * SATIM does not push webhooks: the result is read back with confirmOrder.do.
   * Called by the return route once the customer comes back from the bank page.
   */
  async confirmOrder(providerRef: string): Promise<WebhookVerdict | null> {
    const missing = missingOf(SATIM_ENV);
    if (missing.length) return null;

    const url = new URL(`${env("SATIM_GATEWAY_URL")!.replace(/\/$/, "")}/confirmOrder.do`);
    url.searchParams.set("userName", env("SATIM_USERNAME")!);
    url.searchParams.set("password", env("SATIM_PASSWORD")!);
    url.searchParams.set("orderId", providerRef);
    url.searchParams.set("language", "fr");

    const res = await fetch(url, { method: "GET" });
    const body = (await res.json().catch(() => null)) as
      | { orderStatus?: number; errorCode?: string; Amount?: number; actionCodeDescription?: string }
      | null;
    if (!body) return null;

    const paid = body.orderStatus === 2;
    const declined = body.orderStatus === 6 || body.errorCode === "1";
    return {
      eventId: `satim:${providerRef}:${body.orderStatus ?? "x"}`,
      eventType: `orderStatus_${body.orderStatus ?? "unknown"}`,
      providerRef,
      result: paid ? "paid" : declined ? "failed" : "pending",
      amountDa: typeof body.Amount === "number" ? Math.round(body.Amount / 100) : null,
      reason: paid ? null : (body.actionCodeDescription ?? null),
    };
  },

  verifyWebhook(): WebhookVerdict | null {
    // No provider-pushed webhook for SATIM.
    return null;
  },
};

// ----------------------------------------------------------------- BaridiMob
// Algérie Poste offers no public merchant API: transfers are confirmed manually.
const baridimob = {
  key: "baridimob" as ProviderKey,
  label: "BaridiMob (virement, confirmation manuelle)",
  methods: ["baridimob"],
  requiredEnv: ["BARIDIMOB_ACCOUNT_RIP"],
  webhookPath: null,
  notes:
    "Algérie Poste ne fournit pas d'API marchand publique. Le client envoie un virement BaridiMob vers votre RIP, puis vous confirmez le paiement depuis le tableau de bord.",
  mode(): IntegrationMode {
    return "n/a";
  },
  async createCheckout(): Promise<CheckoutSession> {
    throw new ProviderNotConfigured([]);
  },
  verifyWebhook(): WebhookVerdict | null {
    return null;
  },
};

// ------------------------------------------------------------ Cash on delivery
const cod = {
  key: "cod" as ProviderKey,
  label: "Paiement à la livraison",
  methods: ["cod"],
  requiredEnv: [] as string[],
  webhookPath: null,
  notes: "Aucune configuration requise. La commande est créée immédiatement.",
  mode(): IntegrationMode {
    return "n/a";
  },
  async createCheckout(): Promise<CheckoutSession> {
    throw new ProviderNotConfigured([]);
  },
  verifyWebhook(): WebhookVerdict | null {
    return null;
  },
};

export const PROVIDERS = { chargily, satim, baridimob, cod };

export function providerForMethod(methodCode: string, providerKey: string) {
  const direct = (PROVIDERS as Record<string, unknown>)[providerKey];
  if (direct) return direct as typeof chargily | typeof satim | typeof baridimob | typeof cod;
  const found = Object.values(PROVIDERS).find((p) => p.methods.includes(methodCode));
  return found ?? null;
}

export function integrationStatus(): ProviderIntegration[] {
  return Object.values(PROVIDERS).map((p) => {
    const missing = missingOf(p.requiredEnv);
    const manual = p.key === "cod" || p.key === "baridimob";
    return {
      key: p.key,
      label: p.label,
      methods: p.methods,
      state: manual
        ? "manual"
        : missing.length === 0
          ? "configured"
          : missing.length === p.requiredEnv.length
            ? "not_configured"
            : "missing_credentials",
      mode: p.mode(),
      requiredEnv: p.requiredEnv,
      missingEnv: missing,
      webhookPath: p.webhookPath,
      notes: p.notes,
    } satisfies ProviderIntegration;
  });
}
