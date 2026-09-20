// Browser-safe payment types. No credentials, no secrets here.

export type ProviderKey = "chargily" | "satim" | "baridimob" | "cod";

export type IntegrationState =
  | "configured" // all credentials present
  | "missing_credentials" // partially configured
  | "not_configured" // nothing set
  | "manual"; // no API: handled by the store team

export type IntegrationMode = "test" | "production" | "n/a";

export type ProviderIntegration = {
  key: ProviderKey;
  label: string;
  /** methods (payment_methods.code) served by this provider */
  methods: string[];
  state: IntegrationState;
  mode: IntegrationMode;
  /** environment variable names required — names only, never values */
  requiredEnv: string[];
  missingEnv: string[];
  /** webhook URL the merchant must register with the provider */
  webhookPath: string | null;
  notes: string;
};

export type StartPaymentResult =
  | { ok: true; redirectUrl: string; mode: IntegrationMode }
  | { ok: false; reason: "NOT_CONFIGURED" | "MANUAL" | "ALREADY_PAID" | "ERROR"; message: string };
