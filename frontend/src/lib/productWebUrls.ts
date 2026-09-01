export const LOCRAM_BILLING_PATH = "/billing";
export const LOCRAM_CHECKOUT_PATH = "/billing";
export const PRODUCT_WEB_BASE_URL_REQUIRED_MESSAGE =
  "Set VITE_LOCRAM_PRODUCT_WEB_URL to open Locram billing in the browser.";

function normalizeAbsoluteHttpOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      (parsed.pathname !== "" && parsed.pathname !== "/") ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getConfiguredProductWebBaseUrl(): string | null {
  return normalizeAbsoluteHttpOrigin(
    import.meta.env.VITE_LOCRAM_PRODUCT_WEB_URL,
  );
}

export function buildLocramBillingUrl(productWebBaseUrl: string): string {
  return `${productWebBaseUrl}${LOCRAM_BILLING_PATH}`;
}

export function buildLocramCheckoutUrl(productWebBaseUrl: string): string {
  return `${productWebBaseUrl}${LOCRAM_CHECKOUT_PATH}`;
}
