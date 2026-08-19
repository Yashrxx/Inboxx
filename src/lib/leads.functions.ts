/**
 * Admin server functions for the Leads dashboard.
 *
 * All gated by requireSupabaseAuth — only signed-in admins can read or
 * mutate leads / fetch conversation threads.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("last_activity", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const UpdateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["bot_handling", "needs_human", "handed_over", "converted", "dead"]),
});

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { error } = await supabaseAdmin
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const ThreadSchema = z.object({ sessionId: z.string().uuid() });

export const getLeadThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ThreadSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { data: rows, error } = await supabaseAdmin
      .from("answer_logs")
      .select("id, incoming_text, answer_text, confidence_flag, created_at")
      .eq("session_id", data.sessionId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const DeleteSchema = z.object({ id: z.string().uuid() });

export const deleteLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => DeleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);
    const { error } = await supabaseAdmin
      .from("leads")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
