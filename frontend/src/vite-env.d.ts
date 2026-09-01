/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOCRAM_BRIDGE_URL?: string;
  readonly VITE_LOCRAM_BRIDGE_URL_BROWSER?: string;
  readonly VITE_LOCRAM_ACCOUNT_WEB_URL?: string;
  readonly VITE_LOCRAM_PRODUCT_WEB_URL?: string;
  readonly VITE_LOCRAM_E2E_SKIP_OPEN_PAGE_REFRESH?: string;
}
