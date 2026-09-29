/** Secret per-order checkout token kept only in the browser that placed the order. */
const PREFIX = "fallen.paytoken.";

export function savePaymentToken(orderNumber: string, token: string) {
  try {
    localStorage.setItem(PREFIX + orderNumber, token);
  } catch {
    /* ignore */
  }
}

export function readPaymentToken(orderNumber: string): string | undefined {
  try {
    return localStorage.getItem(PREFIX + orderNumber) ?? undefined;
  } catch {
    return undefined;
  }
}
