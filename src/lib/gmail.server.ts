/**
 * Server-only Gmail helpers.
 *
 * All Gmail HTTP work lives here so that server-function modules stay thin
 * wrappers. `fetchGmailInboxDirect(userId)` can also be called from other
 * server code (e.g. the automations orchestrator) without going through RPC.
 */
import { sanitizeEmailBody } from "./security.server";

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

export type GmailAttachment = {
  filename: string;
  mimeType?: string;
  attachmentId?: string;
  size?: number;
  base64?: string;
};

export type GmailMessage = {
  id: string;
  threadId: string;
  from: string;
  fromEmail: string;
  subject: string;
  snippet: string;
  body: string;
  date: string;
  attachments?: GmailAttachment[];
};

async function getGmailTokens(
  userId: string,
): Promise<{ access_token: string; refresh_token: string | null }> {
  console.log(`[Gmail Auth] Retrieving OAuth tokens for user: ${userId}`);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("access_token, refresh_token, email")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();
  if (error) {
    console.error(
      `[Gmail Webhook Error]: Database error retrieving tokens for user ${userId}:`,
      error.message,
    );
    throw new Error(error.message);
  }
  if (!data) {
    console.warn(
      `[Gmail Auth] Gmail not connected for user ${userId}. No integration row found in database.`,
    );
    throw new Error("Gmail not connected. Please connect your Gmail account.");
  }
  return {
    access_token: data.access_token || "connected_active",
    refresh_token: data.refresh_token ?? null,
  };
}

async function refreshGmailToken(userId: string): Promise<string> {
  console.log(`[Gmail Auth] Refreshing expired access token for user: ${userId}`);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("integrations")
    .select("refresh_token")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();
  if (error) {
    console.error(
      `[Gmail Webhook Error]: Database error fetching refresh_token for user ${userId}:`,
      error.message,
    );
    throw new Error(error.message);
  }
  const refresh_token = data?.refresh_token;
  if (!refresh_token) {
    console.warn(`[Gmail Auth] User ${userId} has no refresh token stored.`);
    throw new Error(
      "Gmail session expired and no refresh token is available. Please reconnect Gmail.",
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn(
      "[Gmail Auth] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variable is missing.",
    );
    throw new Error("Gmail session expired or requires re-authentication. Please reconnect Gmail.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    const t = await res.text();
    console.warn(
      `[Gmail Auth] Token refresh endpoint returned status ${res.status}: ${t.slice(0, 200)}`,
    );
    throw new Error(
      `Failed to refresh Gmail token (${res.status}): ${t.slice(0, 200)}. Please reconnect Gmail.`,
    );
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) {
    console.warn("[Gmail Auth] Token refresh response missing access_token field.");
    throw new Error("Gmail token refresh returned no access_token. Please reconnect Gmail.");
  }

  await supabaseAdmin
    .from("integrations")
    .update({ access_token: json.access_token })
    .eq("user_id", userId)
    .eq("provider", "gmail");

  console.log(
    `[Gmail Auth] Successfully refreshed and persisted new OAuth access token for user ${userId}`,
  );
  return json.access_token;
}

/** Gmail API request with a single automatic token refresh on 401. */
export async function gmailFetch(
  userId: string,
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const { access_token } = await getGmailTokens(userId);
  const doFetch = (token: string) =>
    fetch(url, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}` },
    });

  let res = await doFetch(access_token);
  if (res.status === 401) {
    console.warn(
      `[Gmail Auth] Request returned 401 Unauthorized for user ${userId}. Attempting access token refresh...`,
    );
    try {
      const fresh = await refreshGmailToken(userId);
      res = await doFetch(fresh);
    } catch (refreshErr) {
      console.warn(
        "[Gmail Auth] Token refresh unavailable:",
        refreshErr instanceof Error ? refreshErr.message : refreshErr,
      );
      throw new Error(
        "Gmail session expired or requires re-authentication. Please reconnect Gmail.",
      );
    }
  }
  return res;
}

function decodeBase64Url(s: string): string {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(b64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

export function encodeBase64Url(s: string): string {
  return Buffer.from(s, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Recursively pull the best text body out of a (possibly nested) payload. */
function extractBody(payload: any): string {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data)
    return decodeBase64Url(payload.body.data);

  const children: any[] = [];
  if (Array.isArray(payload.parts)) children.push(...payload.parts);
  if (payload.body?.message?.payload) children.push(payload.body.message.payload);

  const plain = children.find((p: any) => p?.mimeType === "text/plain");
  if (plain?.body?.data) return decodeBase64Url(plain.body.data);

  for (const child of children) {
    const nested = extractBody(child);
    if (nested) return nested;
  }

  if (payload.body?.data) return decodeBase64Url(payload.body.data);
  return "";
}

/**
 * Recursively collect every attachment part, unwrapping nested containers
 * such as multipart/* and forwarded `message/rfc822` threads so payloads and
 * filenames are never lost.
 */
export function extractAttachmentsFromPayload(payload: any): GmailAttachment[] {
  const attachments: GmailAttachment[] = [];
  const seen = new Set<any>();

  function walk(part: any) {
    if (!part || typeof part !== "object" || seen.has(part)) return;
    seen.add(part);

    const filename: string = part.filename ?? "";
    if (filename.trim().length > 0) {
      attachments.push({
        filename,
        mimeType: part.mimeType || "application/octet-stream",
        attachmentId: part.body?.attachmentId,
        data: part.body?.data,
        size: part.body?.size || 0,
      } as GmailAttachment & { data?: string });
    }

    // Forwarded / embedded messages (message/rfc822 and friends)
    if (part.body?.message?.payload) walk(part.body.message.payload);
    if (part.message?.payload) walk(part.message.payload);
    if (part.payload) walk(part.payload);

    if (Array.isArray(part.parts)) for (const child of part.parts) walk(child);
  }

  walk(payload);
  return attachments;
}

function headerValue(headers: { name: string; value: string }[], name: string) {
  return headers.find((x) => x.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

/** Fetch one message by id and hydrate its body + attachment payloads. */
export async function hydrateGmailMessage(
  userId: string,
  messageId: string,
): Promise<GmailMessage | null> {
  try {
    const r = await gmailFetch(userId, `${GMAIL_BASE}/messages/${messageId}?format=full`);
    if (!r.ok) return null;
    const j: any = await r.json();
    const headers: { name: string; value: string }[] = j.payload?.headers ?? [];
    const fromRaw = headerValue(headers, "From");
    const emailMatch = fromRaw.match(/<([^>]+)>/);
    const fromEmail = emailMatch ? emailMatch[1] : fromRaw;
    const fromName = emailMatch
      ? fromRaw
          .replace(/<[^>]+>/, "")
          .trim()
          .replace(/^"|"$/g, "")
      : fromRaw;

    const rawAttachments = extractAttachmentsFromPayload(j.payload) as Array<
      GmailAttachment & { data?: string }
    >;

    const attachments: GmailAttachment[] = await Promise.all(
      rawAttachments.map(async (att) => {
        if (att.attachmentId && !att.data) {
          try {
            console.log(
              `[Gmail Webhook] Fetching attachment payload for "${att.filename}" (MIME: ${att.mimeType ?? "unknown"}, ID: ${att.attachmentId})`,
            );
            const attRes = await gmailFetch(
              userId,
              `${GMAIL_BASE}/messages/${j.id}/attachments/${att.attachmentId}`,
            );
            if (attRes.ok) {
              const attJson = (await attRes.json()) as {
                data: string;
                size: number;
              };
              console.log(
                `[Gmail Webhook] Successfully fetched attachment payload for "${att.filename}" (${attJson.data ? attJson.data.length : 0} b64 chars)`,
              );
              return {
                filename: att.filename,
                mimeType: att.mimeType,
                attachmentId: att.attachmentId,
                size: attJson.size ?? att.size,
                base64: attJson.data,
              };
            } else {
              const errBody = await attRes.text();
              console.error(
                `[Gmail Webhook Error]: Failed to fetch attachment payload for "${att.filename}" (MIME: ${att.mimeType}) for message ${j.id}. HTTP ${attRes.status}: ${errBody.slice(0, 200)}`,
              );
            }
          } catch (attErr: any) {
            console.error(
              `[Gmail Webhook Error]: Error fetching attachment payload for "${att.filename}" (MIME: ${att.mimeType}):`,
              attErr,
            );
          }
        }
        return {
          filename: att.filename,
          mimeType: att.mimeType,
          attachmentId: att.attachmentId,
          size: att.size,
          base64: att.data,
        };
      }),
    );

    return {
      id: j.id,
      threadId: j.threadId,
      from: fromName || fromEmail,
      fromEmail,
      subject: headerValue(headers, "Subject"),
      snippet: j.snippet ?? "",
      // Gmail bodies are untrusted third-party HTML — strip all markup
      // server-side before it ever reaches the browser.
      body: sanitizeEmailBody(extractBody(j.payload) || j.snippet || ""),
      date: headerValue(headers, "Date"),
      attachments,
    } as GmailMessage;
  } catch (msgErr: any) {
    console.error(
      `[Gmail Webhook Error]: Error fetching message details for ${messageId}:`,
      msgErr,
    );
    return null;
  }
}

/**
 * Guard against rows whose access_token is a placeholder rather than a real
 * Google bearer token (e.g. the legacy "connected_active" sentinel). Those can
 * never authenticate, so fail loudly instead of pretending to be connected.
 */
function assertUsableAccessToken(accessToken: string | null | undefined): string {
  if (!accessToken || !accessToken.startsWith("ya29.")) {
    throw new Error(
      "Gmail is linked but no valid Google access token is stored. Please reconnect Gmail.",
    );
  }
  return accessToken;
}

/**
 * Fetch the latest inbox messages with fully-hydrated attachment payloads.
 * Callable directly from any server code (no RPC boundary).
 */
export async function fetchGmailInboxDirect(userId: string, limit = 10): Promise<GmailMessage[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: intData } = await supabaseAdmin
    .from("integrations")
    .select("access_token, email")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();

  if (!intData) {
    throw new Error("Gmail not connected. Please connect your Gmail account.");
  }

  assertUsableAccessToken(intData.access_token);

  const listRes = await gmailFetch(userId, `${GMAIL_BASE}/messages?maxResults=${limit}&q=in:inbox`);
  if (!listRes.ok) {
    const t = await listRes.text();
    console.error(`[Gmail Server] Inbox list failed (${listRes.status}): ${t.slice(0, 300)}`);
    throw new Error(`Gmail inbox fetch failed (${listRes.status}): ${t.slice(0, 300)}`);
  }

  const listJson = (await listRes.json()) as {
    messages?: { id: string; threadId: string }[];
  };

  // An empty inbox is a valid result, not a failure.
  if (!Array.isArray(listJson.messages) || listJson.messages.length === 0) return [];

  const msgs = await Promise.all(listJson.messages.map((m) => hydrateGmailMessage(userId, m.id)));
  return msgs.filter((m): m is GmailMessage => m !== null);
}

export async function sendGmailReplyDirect(
  userId: string,
  data: {
    to: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyToMessageId?: string;
  },
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: intData } = await supabaseAdmin
    .from("integrations")
    .select("access_token")
    .eq("user_id", userId)
    .eq("provider", "gmail")
    .maybeSingle();

  if (!intData) {
    throw new Error("Gmail not connected. Please connect your Gmail account.");
  }

  assertUsableAccessToken(intData.access_token);

  const subject = data.subject.startsWith("Re:") ? data.subject : `Re: ${data.subject}`;
  const headers = [
    `To: ${data.to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "MIME-Version: 1.0",
  ];
  if (data.inReplyToMessageId) {
    headers.push(`In-Reply-To: ${data.inReplyToMessageId}`);
    headers.push(`References: ${data.inReplyToMessageId}`);
  }
  const raw = encodeBase64Url(headers.join("\r\n") + "\r\n\r\n" + data.body);

  const res = await gmailFetch(userId, `${GMAIL_BASE}/messages/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ raw, threadId: data.threadId }),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`[Gmail Server] Send failed (${res.status}): ${t.slice(0, 300)}`);
    throw new Error(`Gmail send failed (${res.status}): ${t.slice(0, 300)}`);
  }

  return { ok: true };
}

/* --------------------------------------------------- push notifications */

/**
 * Register a Gmail push-notification watch on the user's inbox and persist
 * the returned expiration + historyId on their workspace row.
 */
export async function setupGmailWatchDirect(userId: string) {
  const topicName = process.env.GCP_PUBSUB_TOPIC;
  if (!topicName) {
    throw new Error(
      "GCP_PUBSUB_TOPIC is not configured on the server (expected projects/<project>/topics/<topic>).",
    );
  }

  const res = await gmailFetch(userId, `${GMAIL_BASE}/watch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicName,
      labelIds: ["INBOX"],
      labelFilterBehavior: "INCLUDE",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gmail watch failed (${res.status}): ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    historyId?: string;
    expiration?: string;
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Store the connected Gmail address so the webhook can map back to a user.
  let emailAddress: string | null = null;
  try {
    const profRes = await gmailFetch(userId, `${GMAIL_BASE}/profile`);
    if (profRes.ok) {
      const prof = (await profRes.json()) as { emailAddress?: string };
      emailAddress = prof.emailAddress ?? null;
    }
  } catch {
    /* non-fatal */
  }

  await supabaseAdmin
    .from("workspaces")
    .update({
      gmail_history_id: json.historyId ?? null,
      gmail_watch_expiration: json.expiration ? Number(json.expiration) : null,
      ...(emailAddress ? { gmail_email_address: emailAddress } : {}),
    } as never)
    .eq("user_id", userId);

  return {
    historyId: json.historyId ?? null,
    expiration: json.expiration ?? null,
    emailAddress,
  };
}

/**
 * Stop a Gmail push-notification watch on the user's inbox and clear
 * the watch database fields on their workspace row.
 */
export async function disableGmailWatchDirect(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  try {
    await gmailFetch(userId, `${GMAIL_BASE}/stop`, {
      method: "POST",
    });
  } catch (err: any) {
    console.warn("[Gmail Watch] stop API call failed/ignored:", err?.message ?? err);
  }

  await supabaseAdmin
    .from("workspaces")
    .update({
      gmail_history_id: null,
      gmail_watch_expiration: null,
    } as any)
    .eq("user_id", userId);

  return { ok: true };
}

/**
 * List message ids added since `startHistoryId` and hydrate each one.
 * Returns the messages plus the newest historyId seen.
 */
export async function fetchGmailMessagesSinceHistory(
  userId: string,
  startHistoryId: string,
  limit = 20,
): Promise<{ messages: GmailMessage[]; latestHistoryId: string | null }> {
  const url =
    `${GMAIL_BASE}/history?startHistoryId=${encodeURIComponent(startHistoryId)}` +
    `&historyTypes=messageAdded&labelId=INBOX&maxResults=${limit}`;
  console.log(
    `[Gmail Webhook] Querying Gmail history since history ID ${startHistoryId} for user ${userId}`,
  );
  const res = await gmailFetch(userId, url);
  if (!res.ok) {
    const t = await res.text();
    console.error(
      `[Gmail Webhook Error]: Gmail history query failed (${res.status}): ${t.slice(0, 300)}`,
    );
    throw new Error(`Gmail history failed (${res.status}): ${t.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    history?: { messagesAdded?: { message: { id: string } }[] }[];
    historyId?: string;
  };

  const ids = new Set<string>();
  for (const h of json.history ?? []) {
    for (const added of h.messagesAdded ?? []) {
      if (added?.message?.id) ids.add(added.message.id);
    }
  }

  const messageIds = Array.from(ids);
  console.log(
    `[Gmail Webhook] Fetched list of ${messageIds.length} new message ID(s) from Gmail API since history ${startHistoryId}:`,
    messageIds,
  );

  const hydrated = await Promise.all(
    messageIds.slice(0, limit).map((id) => hydrateGmailMessage(userId, id)),
  );

  const validMessages = hydrated.filter((m): m is GmailMessage => m !== null);
  console.log(
    `[Gmail Webhook] Hydrated ${validMessages.length}/${messageIds.length} message(s) successfully.`,
  );

  return {
    messages: validMessages,
    latestHistoryId: json.historyId ?? null,
  };
}
