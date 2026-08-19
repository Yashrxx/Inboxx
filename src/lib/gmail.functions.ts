/**
 * Gmail API server functions — thin RPC wrappers around `gmail.server.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type { GmailMessage, GmailAttachment } from "./gmail.server";

export const fetchGmailInbox = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { fetchGmailInboxDirect } = await import("./gmail.server");
    return fetchGmailInboxDirect(context.userId);
  });

export const sendGmailReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        to: z.string().email(),
        subject: z.string().min(1).max(998),
        body: z.string().min(1).max(50_000),
        threadId: z.string().optional(),
        inReplyToMessageId: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { sendGmailReplyDirect } = await import("./gmail.server");
    return sendGmailReplyDirect(context.userId, data);
  });

/** Register Gmail push notifications (Pub/Sub watch) for the current user. */
export const setupGmailWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { setupGmailWatchDirect } = await import("./gmail.server");
    return setupGmailWatchDirect(context.userId);
  });

export const getGmailWatchStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("workspaces")
      .select("gmail_watch_expiration")
      .eq("user_id", context.userId)
      .maybeSingle();

    const expiration = data?.gmail_watch_expiration ?? null;
    const isPushEnabled = expiration ? expiration > Date.now() : false;
    return {
      isPushEnabled,
      expiration,
    };
  });

export const disableGmailWatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { disableGmailWatchDirect } = await import("./gmail.server");
    return disableGmailWatchDirect(context.userId);
  });
