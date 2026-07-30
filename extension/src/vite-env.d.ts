/// <reference types="vite/client" />

// Type our own env var so import.meta.env.VITE_APP_BASE_URL is known.
// (tsconfig restricts `types` to ["chrome"], so this triple-slash reference
// is what pulls in Vite's import.meta.env typings.)
interface ImportMetaEnv {
    readonly VITE_APP_BASE_URL?: string;
  }
  
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }