/**
 * Server-only webhook handlers shared by the `/api/webhooks/*` and
 * `/api/public/webhooks/*` routes.
 */

/* ------------------------------------------------------------ gmail push */

export async function handleGmailNotification(request: Request): Promise<Response> {
  let payload: any;
  try {
    payload = await request.json();
    console.log("[Gmail Webhook] Raw incoming Pub/Sub payload:", JSON.stringify(payload));
  } catch (parseErr) {
    console.error(
      "[Gmail Webhook Error]: Failed to parse JSON body from incoming request:",
      parseErr,
    );
    return new Response("Bad request", { status: 400 });
  }

  const encoded: string | undefined = payload?.message?.data;
  if (!encoded) {
    // Pub/Sub verification pings and unrelated payloads: ack so Google does not retry.
    console.log(
      "[Gmail Webhook] Received payload without message.data (verification ping/heartbeat). Responding with 200 OK.",
    );
    return Response.json({ ok: true, ignored: true });
  }

  let notification: { emailAddress?: string; historyId?: string | number } = {};
  try {
    const decodedString = Buffer.from(
      encoded.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    ).toString("utf-8");
    notification = JSON.parse(decodedString);
    console.log("[Gmail Webhook] Successfully decoded Pub/Sub payload data:", {
      emailAddress: notification.emailAddress,
      historyId: notification.historyId,
      messageId: payload?.message?.messageId,
      publishTime: payload?.message?.publishTime,
      subscription: payload?.subscription,
    });
  } catch (err) {
    console.error("[Gmail Webhook Error]: Failed to decode or parse message.data:", err);
    return Response.json({ ok: true, ignored: true });
  }

  const emailAddress = notification.emailAddress;
  const notifiedHistoryId = notification.historyId != null ? String(notification.historyId) : null;
  if (!emailAddress) {
    console.warn(
      "[Gmail Webhook] Decoded notification payload missing emailAddress. Responding 200 OK.",
    );
    return Response.json({ ok: true, ignored: true });
  }

  try {
    console.log(`[Gmail Webhook] Resolving target workspace for emailAddress: "${emailAddress}"`);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const wsLookup = await supabaseAdmin
      .from("workspaces")
      .select("id, user_id, gmail_history_id")
      .eq("gmail_email_address" as never, emailAddress as never)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let ws = wsLookup.data;
    const wsError = wsLookup.error;

    if (wsError) {
      console.error(
        `[Gmail Webhook Error]: Error looking up workspace by gmail_email_address:`,
        wsError.message,
      );
    }

    if (!ws) {
      console.log(
        `[Gmail Webhook] Direct workspace match not found. Falling back to provider integration record for "${emailAddress}"`,
      );
      // Fall back to the Gmail integration record.
      const { data: integ, error: integErr } = await supabaseAdmin
        .from("integrations")
        .select("user_id")
        .eq("provider", "gmail")
        .eq("email", emailAddress)
        .maybeSingle();

      if (integErr) {
        console.error(
          `[Gmail Webhook Error]: Error looking up integrations by email:`,
          integErr.message,
        );
      }

      if (integ?.user_id) {
        const { data, error: wsFallbackErr } = await supabaseAdmin
          .from("workspaces")
          .select("id, user_id, gmail_history_id")
          .eq("user_id", integ.user_id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (wsFallbackErr) {
          console.error(
            `[Gmail Webhook Error]: Error looking up workspace by fallback user_id:`,
            wsFallbackErr.message,
          );
        }
        ws = data ?? null;
      }
    }

    if (!ws) {
      console.warn(
        `[Gmail Webhook] No workspace or user integration record found for ${emailAddress}`,
      );
      return Response.json({ ok: true, ignored: true });
    }

    console.log(
      `[Gmail Webhook] Resolved target workspace ${ws.id} (user_id: ${ws.user_id}). Stored historyId: ${(ws as any).gmail_history_id ?? "none"}`,
    );

    const startHistoryId = (ws as any).gmail_history_id ?? notifiedHistoryId;
    if (!startHistoryId) {
      console.log(
        `[Gmail Webhook] Initializing gmail_history_id to ${notifiedHistoryId} for workspace ${ws.id}`,
      );
      await supabaseAdmin
        .from("workspaces")
        .update({ gmail_history_id: notifiedHistoryId } as never)
        .eq("id", ws.id);
      return Response.json({ ok: true, initialized: true });
    }

    console.log(
      `[Gmail Webhook] Fetching Gmail messages since history ID ${startHistoryId} for user ${ws.user_id}...`,
    );
    const { fetchGmailMessagesSinceHistory } = await import("./gmail.server");
    const { runRulesOnMessages } = await import("./automations.server");

    const { messages, latestHistoryId } = await fetchGmailMessagesSinceHistory(
      ws.user_id,
      String(startHistoryId),
    );

    console.log(
      `[Gmail Webhook] Fetched ${messages.length} message(s) for user ${ws.user_id}. Latest history ID returned: ${latestHistoryId ?? "none"}`,
    );

    let matched = 0;
    if (messages.length > 0) {
      console.log(
        `[Gmail Webhook] Evaluating ${messages.length} message(s) against active rules for workspace ${ws.id}...`,
      );
      const result = await runRulesOnMessages(supabaseAdmin, ws.id, messages);
      matched = result.matched;
      console.log(`[Gmail Webhook] Rule evaluation complete. Matched alerts: ${matched}`);
    }

    const updatedHistoryId = notifiedHistoryId ?? latestHistoryId ?? startHistoryId;
    await supabaseAdmin
      .from("workspaces")
      .update({
        gmail_history_id: updatedHistoryId,
      } as never)
      .eq("id", ws.id);

    console.log(
      `[Gmail Webhook Summary] ${emailAddress}: Scanned ${messages.length} message(s), triggered ${matched} alert(s), updated historyId to ${updatedHistoryId}`,
    );
    return Response.json({ ok: true, scanned: messages.length, matched });
  } catch (err: any) {
    // Always ack: Pub/Sub retries would replay the same history window.
    console.warn("[Gmail Webhook Notice]: Skipped message sync -", err?.message ?? err);
    return Response.json({ ok: true, error: true });
  }
}

/* --------------------------------------------------------------- telegram */

async function telegramSend(chatId: number | string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  }).catch(() => undefined);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Handle Telegram `/start <userId>` deep links and store the chat id. */
export async function handleTelegramUpdate(request: Request): Promise<Response> {
  let update: any;
  try {
    update = await request.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const message = update?.message ?? update?.edited_message;
  const chatId = message?.chat?.id;
  const chatType: string = message?.chat?.type ?? "";
  const text: string = message?.text ?? "";
  if (!chatId || !text.startsWith("/start")) {
    return Response.json({ ok: true, ignored: true });
  }

  // Only allow private 1-on-1 chats — reject groups, supergroups, channels.
  if (chatType !== "private") {
    await telegramSend(
      chatId,
      "⚠️ I can only be linked in a private 1-on-1 chat.\n" +
        "Please open the Connect Telegram link from your Inboxx Assistant settings page — " +
        "it will start a private conversation with me.",
    );
    return Response.json({ ok: true, rejected: "not_private_chat" });
  }

  const userId = text.split(/\s+/)[1]?.trim();
  if (!userId || !UUID_RE.test(userId)) {
    await telegramSend(
      chatId,
      "Please open the Connect Telegram link from your Inboxx Assistant settings page so I know which account to link.",
    );
    return Response.json({ ok: true });
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .update({ telegram_chat_id: String(chatId) } as never)
      .eq("id", userId);
    if (profileErr) throw new Error(profileErr.message);

    // Mirror onto the workspace so the alert engine can notify immediately.
    await supabaseAdmin
      .from("workspaces")
      .update({ telegram_chat_id: String(chatId) })
      .eq("user_id", userId);

    await telegramSend(chatId, "Connected! You will now receive instant email alerts here.");
    return Response.json({ ok: true, linked: true });
  } catch (err: any) {
    console.error("[Telegram webhook] error:", err?.message ?? err);
    await telegramSend(
      chatId,
      "Something went wrong linking your account. Please try the link from Settings again.",
    );
    return Response.json({ ok: true, error: true });
  }
}
