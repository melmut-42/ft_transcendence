/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_PATH?: string;
  readonly VITE_WS_BASE_PATH?: string;
  readonly VITE_DEV_PROXY_TARGET?: string;
  /** `true` swaps both sockets for the in-memory mock in `npm run dev` only. */
  readonly VITE_MOCK_SOCKETS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
