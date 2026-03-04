/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  // add other variables here...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}