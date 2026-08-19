import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

function createSupabaseClient(): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  if (!url || !anonKey) {
    console.error("[Supabase Client] Missing Supabase URL or Anon Key. Check Settings.");
  }

  // Create client with fallback dummy values if missing so module load never crashes
  const finalUrl = url || "https://placeholder.supabase.co";
  const finalKey = anonKey || "placeholder-anon-key";

  return createClient<Database>(finalUrl, finalKey, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

// Re-export a single shared client instance for the browser and SSR components
export const supabase = createSupabaseClient();
export type { Database } from "./types";
