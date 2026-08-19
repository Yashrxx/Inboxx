import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "./env";

function createSupabaseAdminClient(): SupabaseClient<Database> {
  const url = getSupabaseUrl();
  const serviceKey = getSupabaseServiceRoleKey();

  if (!url || !serviceKey) {
    console.error("[Supabase Admin] Missing Supabase URL or Service Role / Anon Key.");
  }

  const finalUrl = url || "https://placeholder.supabase.co";
  const finalKey = serviceKey || "placeholder-key";

  return createClient<Database>(finalUrl, finalKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role / admin privileges
// SECURITY: Only use this for trusted server-side operations, never expose to client code
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
