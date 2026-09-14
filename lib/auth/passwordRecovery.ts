import { createClient } from "@supabase/supabase-js";

export const PASSWORD_RECOVERY_STORAGE_KEY = "ola-password-recovery";

function getSupabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  };
}

export function createPasswordRecoveryRequestClient() {
  const { url, key } = getSupabaseConfig();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "implicit",
      persistSession: false,
    },
  });
}

export function createPasswordRecoveryClient() {
  const { url, key } = getSupabaseConfig();

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: true,
      flowType: "implicit",
      persistSession: true,
      storage: window.sessionStorage,
      storageKey: PASSWORD_RECOVERY_STORAGE_KEY,
    },
  });
}
