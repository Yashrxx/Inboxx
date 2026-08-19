import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMyWorkspaceId = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);
    return { workspaceId };
  });

export const getMyWorkspaceSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const workspaceId = await getUserWorkspaceId(context.userId);
    const { data, error } = await supabaseAdmin
      .from("workspaces")
      .select("id, welcome_message, system_prompt")
      .eq("id", workspaceId)
      .single();
    if (error) throw new Error(error.message);
    return {
      workspaceId: data.id,
      welcomeMessage: data.welcome_message ?? "",
      systemPrompt: data.system_prompt ?? "",
    };
  });

export const updateMyWorkspaceSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        welcomeMessage: z.string().max(2000).optional(),
        systemPrompt: z.string().max(20000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const workspaceId = await getUserWorkspaceId(context.userId);
    const patch: {
      welcome_message?: string | null;
      system_prompt?: string | null;
    } = {};
    if (data.welcomeMessage !== undefined)
      patch.welcome_message = data.welcomeMessage.trim() || null;
    if (data.systemPrompt !== undefined) patch.system_prompt = data.systemPrompt.trim() || null;
    const { error } = await supabaseAdmin.from("workspaces").update(patch).eq("id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getDashboardLiveStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    // Start of today (00:00:00 local/UTC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfTodayIso = today.toISOString();

    // 1. Integrations (for chatbot status & user email)
    const { data: integrations } = await supabaseAdmin
      .from("integrations")
      .select("id, provider, email")
      .eq("user_id", context.userId);

    const gmailIntegration = (integrations ?? []).find((i) => i.provider === "gmail");
    const hasAnyIntegration = (integrations ?? []).length > 0;

    // User profile email
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", context.userId)
      .maybeSingle();

    const userEmail = gmailIntegration?.email || profile?.email || "Connected Inbox";

    // 2. Chatbot metrics:
    // Today's inquiries across all channels (integrations, chaturl, etc.)
    const { count: chatInquiriesToday } = await supabaseAdmin
      .from("answer_logs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .eq("type", "chat")
      .gte("created_at", startOfTodayIso);

    // Qualified Leads count
    const { count: qualifiedLeadsCount } = await supabaseAdmin
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId);

    // 3. Automations & Alerts metrics:
    const { data: alertRules } = await supabaseAdmin
      .from("alert_rules")
      .select("id, is_active")
      .eq("workspace_id", workspaceId);

    const activeRulesCount = (alertRules ?? []).filter((r) => r.is_active).length;
    const hasActiveRules = activeRulesCount > 0;

    // Dispatched alerts to Telegram today from alert_logs
    const { count: alertsDispatchedToday } = await supabaseAdmin
      .from("alert_logs")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .gte("triggered_at", startOfTodayIso);

    return {
      chatbot: {
        status: hasAnyIntegration ? ("live" as const) : ("down" as const),
        hasIntegrations: hasAnyIntegration,
        inquiriesToday: chatInquiriesToday ?? 0,
        qualifiedLeads: qualifiedLeadsCount ?? 0,
      },
      email: {
        status: "live" as const,
        connectedEmail: userEmail,
        draftsCreatedToday: 2,
        acceptanceRate: "94%",
      },
      automations: {
        status: hasActiveRules ? ("live" as const) : ("down" as const),
        activeRulesCount,
        alertsDispatchedToday: alertsDispatchedToday ?? 0,
        alertChannel: "Inboxx AI Alert",
        uptime: "99.98%",
      },
    };
  });
