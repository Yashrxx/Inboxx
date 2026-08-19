import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

// Vite does not put .env values on process.env, so read them explicitly.
// The "" prefix loads every key, not just VITE_-prefixed ones; real shell
// vars win so CI/deploy environments can still override the file.
const env = {
  ...loadEnv(process.env.NODE_ENV || "development", process.cwd(), ""),
  ...process.env,
};

function clean(val: unknown): string {
  if (typeof val !== "string") return "";
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function extractJwtRef(token: unknown): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = clean(token).split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
    if (payload && payload.iss === "supabase" && typeof payload.ref === "string" && payload.ref) {
      return payload.ref;
    }
  } catch {}
  return null;
}

const supabaseAnonKey =
  clean(env.VITE_SUPABASE_ANON_KEY) ||
  clean(env.SUPABASE_ANON_KEY) ||
  clean(env.VITE_SUPABASE_PUBLISHABLE_KEY) ||
  clean(env.SUPABASE_PUBLISHABLE_KEY) ||
  "";

const supabaseServiceKey = clean(env.SUPABASE_SERVICE_ROLE_KEY);

const jwtRef = extractJwtRef(supabaseAnonKey) || extractJwtRef(supabaseServiceKey);

let supabaseUrl =
  clean(env.VITE_SUPABASE_URL) ||
  clean(env.SUPABASE_URL) ||
  (env.SUPABASE_PROJECT_ID ? `https://${clean(env.SUPABASE_PROJECT_ID)}.supabase.co` : "");

if (jwtRef) {
  if (!supabaseUrl || supabaseUrl.includes(".supabase.co")) {
    supabaseUrl = `https://${jwtRef}.supabase.co`;
  }
}

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
    },
    preview: {
      host: "0.0.0.0",
      port: 3000,
      strictPort: true,
      allowedHosts: true,
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseAnonKey),
      "process.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
      "process.env.SUPABASE_URL": JSON.stringify(supabaseUrl),
      "process.env.SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
      "process.env.SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseAnonKey),
    },
  },
});
