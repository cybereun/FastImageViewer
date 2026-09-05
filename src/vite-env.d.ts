/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EDITION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
