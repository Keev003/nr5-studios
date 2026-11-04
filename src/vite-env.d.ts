/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** 'demo' forces the in-browser demo data source. */
  readonly VITE_DATA_SOURCE?: 'demo' | 'supabase'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
