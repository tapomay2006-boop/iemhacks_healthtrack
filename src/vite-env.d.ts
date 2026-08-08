/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SARVAM_API_KEY?: string;
  readonly VITE_DEEPGRAM_API_KEY?: string;
  readonly FAST2SMS_API_KEY?: string;
  readonly VITE_OPENROUTE_API_KEY?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly DATABASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
