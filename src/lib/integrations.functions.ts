/**
 * Server functions for managing third-party integrations (Gmail, WhatsApp).
 * Tokens are stored server-side. RLS scopes rows to the signed-in user.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listIntegrations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integrations")
      .select("id, provider, email, connected_at")
      .order("connected_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/**
 * Upsert an OAuth connection. We never expose tokens back to the client.
 *
 * TODO: Phase 2 — replace placeholder access_token with a real Gmail OAuth
 * exchange (server-side code flow). For now this is called from the admin
 * UI after the user completes Google sign-in so we have a row to display
 * and a place to put the token when the real flow lands.
 */
export const upsertIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        provider: z.enum(["gmail", "whatsapp"]),
        email: z.string().email().max(255).optional(),
        access_token: z.string().max(8000).optional(),
        refresh_token: z.string().max(8000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Defensive: ensure a profile row exists for this user before inserting
    // into integrations (FK integrations.user_id -> profiles.id). The
    // handle_new_user() trigger normally creates this on signup, but older
    // accounts or trigger failures can leave it missing — without this,
    // the insert below fails with integrations_user_id_fkey.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("profiles")
      .upsert(
        { id: context.userId, email: data.email ?? null },
        { onConflict: "id", ignoreDuplicates: true },
      );
    // Also ensure a workspace exists, since other flows depend on it.
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("user_id", context.userId)
      .limit(1)
      .maybeSingle();
    if (!ws) {
      await supabaseAdmin
        .from("workspaces")
        .insert({ user_id: context.userId, name: "My Workspace" });
    }

    // Remove any prior row for same provider, then insert fresh.
    await context.supabase.from("integrations").delete().eq("provider", data.provider);

    const { error } = await context.supabase.from("integrations").insert({
      user_id: context.userId,
      provider: data.provider,
      email: data.email ?? null,
      access_token: data.access_token ?? null,
      refresh_token: data.refresh_token ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ provider: z.enum(["gmail", "whatsapp"]) }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("integrations")
      .delete()
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getGoogleClientId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "",
    };
  });
