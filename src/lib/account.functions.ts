/**
 * Account deletion — removes every row owned by the signed-in user across
 * all product tables, then deletes the Supabase Auth user itself.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // All workspaces owned by this user
    const { data: workspaces, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("user_id", userId);
    if (wsErr) throw new Error(wsErr.message);
    const wsIds = (workspaces ?? []).map((w) => w.id);

    if (wsIds.length) {
      // KB chunks hang off documents
      const { data: docs } = await supabaseAdmin
        .from("kb_documents")
        .select("id")
        .in("workspace_id", wsIds);
      const docIds = (docs ?? []).map((d) => d.id);
      if (docIds.length) {
        await supabaseAdmin.from("kb_chunks").delete().in("document_id", docIds);
      }

      for (const table of [
        "alert_logs",
        "alert_rules",
        "answer_logs",
        "leads",
        "kb_images",
        "kb_documents",
      ] as const) {
        const { error } = await supabaseAdmin.from(table).delete().in("workspace_id", wsIds);
        if (error) throw new Error(`${table}: ${error.message}`);
      }
    }

    await supabaseAdmin.from("integrations").delete().eq("user_id", userId);
    await supabaseAdmin.from("workspaces").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authErr) throw new Error(authErr.message);

    return { ok: true };
  });
