export function formatDA(value: number | null | undefined): string {
  const n = Math.max(0, Math.round(value ?? 0));
  return n.toLocaleString("fr-FR").replace(/\u202f|\u00a0/g, " ");
}

export const ALGERIAN_PHONE = /^0(5|6|7)[0-9]{8}$/;

export function isValidAlgerianPhone(raw: string): boolean {
  return ALGERIAN_PHONE.test(raw.replace(/[\s.-]/g, ""));
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[\s.-]/g, "");
  if (digits.startsWith("+213")) return "0" + digits.slice(4);
  if (digits.startsWith("00213")) return "0" + digits.slice(5);
  if (digits.startsWith("213") && digits.length === 12) return "0" + digits.slice(3);
  return digits;
}
