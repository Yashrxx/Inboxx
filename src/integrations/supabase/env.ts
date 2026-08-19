function clean(val: unknown): string {
  if (typeof val !== "string") return "";
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function extractSupabaseJwtRef(token: string | undefined): string | null {
  if (!token || typeof token !== "string") return null;
  const cleaned = clean(token);
  const parts = cleaned.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadStr =
      typeof Buffer !== "undefined"
        ? Buffer.from(parts[1], "base64").toString("utf-8")
        : typeof atob !== "undefined"
          ? atob(parts[1])
          : "";
    if (!payloadStr) return null;
    const payload = JSON.parse(payloadStr);
    if (payload && payload.iss === "supabase" && typeof payload.ref === "string" && payload.ref) {
      return payload.ref;
    }
  } catch {
    // Ignored
  }
  return null;
}

export function getSupabaseAnonKey(): string {
  const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
  const procEnv = typeof process !== "undefined" && process.env ? process.env : {};

  return (
    clean(metaEnv.VITE_SUPABASE_ANON_KEY) ||
    clean(metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    clean(procEnv.VITE_SUPABASE_ANON_KEY) ||
    clean(procEnv.SUPABASE_ANON_KEY) ||
    clean(procEnv.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    clean(procEnv.SUPABASE_PUBLISHABLE_KEY) ||
    clean(metaEnv.SUPABASE_ANON_KEY) ||
    clean(procEnv.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function getSupabaseServiceRoleKey(): string {
  const procEnv = typeof process !== "undefined" && process.env ? process.env : {};
  const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};

  return (
    clean(procEnv.SUPABASE_SERVICE_ROLE_KEY) ||
    clean(procEnv.SUPABASE_ANON_KEY) ||
    clean(procEnv.VITE_SUPABASE_ANON_KEY) ||
    clean(procEnv.SUPABASE_PUBLISHABLE_KEY) ||
    clean(procEnv.VITE_SUPABASE_PUBLISHABLE_KEY) ||
    clean(metaEnv.VITE_SUPABASE_ANON_KEY)
  );
}

export function getSupabaseUrl(): string {
  const metaEnv = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : {};
  const procEnv = typeof process !== "undefined" && process.env ? process.env : {};

  const anonKey = getSupabaseAnonKey();
  const serviceKey = getSupabaseServiceRoleKey();
  const jwtRef = extractSupabaseJwtRef(anonKey) || extractSupabaseJwtRef(serviceKey);

  const rawUrl =
    clean(metaEnv.VITE_SUPABASE_URL) ||
    clean(procEnv.VITE_SUPABASE_URL) ||
    clean(procEnv.SUPABASE_URL) ||
    clean(metaEnv.SUPABASE_URL);

  const rawProjectId =
    clean(metaEnv.VITE_SUPABASE_PROJECT_ID) ||
    clean(procEnv.VITE_SUPABASE_PROJECT_ID) ||
    clean(procEnv.SUPABASE_PROJECT_ID) ||
    clean(metaEnv.SUPABASE_PROJECT_ID);

  // If the JWT has a specific project ref (e.g. bbybqxdcycgqvqbheimf),
  // and the configured URL has a mismatched supabase.co subdomain (e.g. old mhkimemwpuodmtnwxucz),
  // we prioritize the JWT project ref because the key is strictly authenticated against that project.
  if (jwtRef) {
    if (!rawUrl || rawUrl.includes(".supabase.co")) {
      return `https://${jwtRef}.supabase.co`;
    }
  }

  if (rawUrl) {
    return rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
      ? rawUrl
      : `https://${rawUrl}`;
  }

  if (rawProjectId) {
    return `https://${rawProjectId}.supabase.co`;
  }

  return "";
}
