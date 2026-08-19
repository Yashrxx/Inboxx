/**
 * Automations: alert rules + alert logs.
 *
 * Rules describe what to look for in incoming emails (sender / subject / body /
 * attachments). When an email matches, we write a row to `alert_logs` and
 * optionally push a Telegram notification using the workspace's bot token.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCAN_SOURCES = ["body", "subject", "sender", "attachments"] as const;
const OPERATORS = ["contains", "exact", "regex"] as const;

async function currentWorkspaceId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("workspaces")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No workspace found for this account.");
  return data.id as string;
}

/* ------------------------------------------------------------------ rules */

export const listAlertRules = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("alert_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const ruleInput = z.object({
  rule_name: z.string().min(1).max(200),
  scan_sources: z.array(z.enum(SCAN_SOURCES)).min(1),
  operator: z.enum(OPERATORS),
  keywords: z.array(z.string().min(1).max(200)).min(1),
  topic_keywords: z.array(z.string().min(1).max(200)).default([]),
  notify_on_missing_keyword: z.boolean().default(false),
  ai_summarize: z.boolean().default(false),
  notify_telegram: z.boolean().default(true),
  tg_show_subject: z.boolean().default(false),
  tg_show_sender: z.boolean().default(false),
  tg_show_match_details: z.boolean().default(false),
  tg_show_scanned_file: z.boolean().default(false),
  tg_show_detailed_summary: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const createAlertRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ruleInput.parse(input))
  .handler(async ({ data, context }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("alert_rules")
      .insert({ ...data, workspace_id: workspaceId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateAlertRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid() }).merge(ruleInput.partial()).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { data: row, error } = await context.supabase
      .from("alert_rules")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAlertRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("alert_rules").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------- logs */

export const listAlertLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        search: z.string().max(200).optional(),
        page: z.number().int().min(0).default(0),
        pageSize: z.number().int().min(1).max(100).default(25),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    let query = context.supabase
      .from("alert_logs")
      .select("*, alert_rules(rule_name)", { count: "exact" })
      .eq("workspace_id", workspaceId)
      .order("triggered_at", { ascending: false })
      .range(data.page * data.pageSize, data.page * data.pageSize + data.pageSize - 1);

    if (data.search) {
      const s = `%${data.search}%`;
      query = query.or(
        `email_subject.ilike.${s},sender_email.ilike.${s},matched_keyword.ilike.${s},source_filename.ilike.${s}`,
      );
    }

    const { data: rows, error, count } = await query;
    if (error) throw new Error(error.message);
    return { rows: rows ?? [], count: count ?? 0 };
  });

export const deleteAlertLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("alert_logs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------- telegram config */

export const getTelegramConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error: profileErr } = await context.supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileErr) throw new Error(profileErr.message);

    const { data: ws, error: wsErr } = await context.supabase
      .from("workspaces")
      .select("id, telegram_bot_token")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (wsErr) throw new Error(wsErr.message);

    return {
      hasToken: Boolean(ws?.telegram_bot_token),
      chatId: profile?.telegram_chat_id ?? "",
    };
  });

export const saveTelegramConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        bot_token: z.string().max(200).optional(),
        chat_id: z.string().max(100).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const patch: {
      telegram_bot_token?: string;
      telegram_chat_id?: string | null;
    } = {};
    if (data.bot_token !== undefined && data.bot_token !== "")
      patch.telegram_bot_token = data.bot_token;
    if (data.chat_id !== undefined) patch.telegram_chat_id = data.chat_id || null;
    const { error } = await context.supabase.from("workspaces").update(patch).eq("id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const testTelegramNotification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendTelegramNotification } = await import("./automations.server");

    const result = await sendTelegramNotification(
      context.supabase,
      context.userId,
      "✅ Inboxx Assistant test alert — your Telegram notifications are working.",
    );

    if (result.status === "FAILED") {
      throw new Error(result.error ?? "Failed to send Telegram test notification.");
    }
    if (result.status === "SKIPPED") {
      throw new Error("No Telegram connection configured. Link your Telegram account first.");
    }
    return { ok: true };
  });

export const disconnectTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error: profileErr } = await context.supabase
      .from("profiles")
      .update({ telegram_chat_id: null } as never)
      .eq("id", context.userId);
    if (profileErr) throw new Error(profileErr.message);

    const { error: wsErr } = await context.supabase
      .from("workspaces")
      .update({ telegram_chat_id: null })
      .eq("user_id", context.userId);
    if (wsErr) throw new Error(wsErr.message);

    return { ok: true };
  });

/* -------------------------------------------------------- rule evaluation */

export const evaluateEmailAgainstRules = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        subject: z.string().default(""),
        sender: z.string().default(""),
        body: z.string().default(""),
        attachments: z
          .array(
            z.object({
              filename: z.string(),
              text: z.string().optional(),
              base64: z.string().optional(),
            }),
          )
          .default([]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const { evaluateEmail } = await import("./automations.server");
    return evaluateEmail(context.supabase, workspaceId, data);
  });

/** Fetch the latest Gmail emails and run every active rule against each one. */
export const runRulesOnLatestEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const workspaceId = await currentWorkspaceId(context.supabase, context.userId);
    const { runRulesOnLatestEmails: run } = await import("./automations.server");
    return run(context.supabase, workspaceId, context.userId, 10);
  });
