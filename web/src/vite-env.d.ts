/// <reference types="vite/client" />

import type { InitialAPI } from '@midnight-ntwrk/dapp-connector-api';

interface ImportMetaEnv {
  readonly VITE_NETWORK_ID?: string;
  readonly VITE_INDEXER_URL?: string;
  readonly VITE_INDEXER_WS_URL?: string;
  readonly VITE_DEFAULT_CONTRACT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    midnight?: Record<string, InitialAPI | undefined>;
  }
}

export {};
