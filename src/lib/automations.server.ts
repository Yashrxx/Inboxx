import * as XLSX from "xlsx";

/**
 * Server-only helpers for the automations rule engine:
 * attachment text extraction, keyword normalization/matching, rule
 * evaluation, alert logging and Telegram dispatch.
 */

/* ------------------------------------------------------------ workspace cache */

const workspaceUserCache = new Map<string, string>();

/** Resolve user_id from workspace_id when rule.user_id is not directly present. */
export async function getWorkspaceUserId(
  supabase: any,
  workspaceId: string,
): Promise<string | null> {
  if (!workspaceId) return null;
  if (workspaceUserCache.has(workspaceId)) {
    return workspaceUserCache.get(workspaceId)!;
  }
  try {
    const { data } = await supabase
      .from("workspaces")
      .select("user_id")
      .eq("id", workspaceId)
      .maybeSingle();
    if (data?.user_id) {
      workspaceUserCache.set(workspaceId, data.user_id);
      return data.user_id;
    }
  } catch (err) {
    console.error(`[Workspace Lookup] Failed to find user_id for ${workspaceId}:`, err);
  }
  return null;
}

/* ------------------------------------------------------------ telegram */

export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  // Convert Markdown **bold** to HTML <b>bold</b> for Telegram parse_mode: HTML
  const htmlText = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>").replace(/__(.*?)__/g, "<i>$1</i>");

  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: htmlText,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(`Telegram error [${res.status}]: ${json?.description ?? "unknown"}`);
  }
  return json;
}

/**
 * Send a Telegram notification strictly to the specified user's private chat.
 * Looks up ONLY profiles.telegram_chat_id — no workspace-level fallback.
 * Uses the shared TELEGRAM_BOT_TOKEN env var.
 * Swallows delivery errors so the rule engine continues.
 */
export async function sendTelegramNotification(
  supabase: any,
  userId: string,
  text: string,
): Promise<{ status: "SENT" | "FAILED" | "SKIPPED"; error?: string }> {
  try {
    console.log("[Automations Debug] sendTelegramNotification called:", { userId });

    if (!userId) {
      console.warn("[Telegram] No userId provided — skipping notification.");
      return { status: "SKIPPED" };
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.warn("[Telegram] TELEGRAM_BOT_TOKEN not set — skipping.");
      return { status: "SKIPPED" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("id", userId)
      .maybeSingle();

    const chatId = profile?.telegram_chat_id ?? null;
    console.log("[Automations Debug] Telegram lookup result:", { userId, chatId });

    if (!chatId) {
      console.warn(`[Telegram] User ${userId} has no telegram_chat_id — skipping.`);
      return { status: "SKIPPED" };
    }

    const sendResult = await sendTelegramMessage(botToken, chatId, text);
    console.log("[Automations Debug] Telegram API response:", {
      userId,
      chatId,
      ok: sendResult?.ok,
      description: sendResult?.description,
    });
    return { status: "SENT" };
  } catch (err: any) {
    console.error("[Telegram Notification] Delivery failed gracefully:", err?.message ?? err);
    return { status: "FAILED", error: err?.message ?? String(err) };
  }
}

/* ---------------------------------------------------------- extraction */

/** Attachment parsing status — persisted in alert_logs.attachment_status. */
export type AttachmentStatus =
  "PARSED" | "RAW_SCANNED" | "SKIPPED_EXCEEDED_SIZE" | "SKIPPED_UNSUPPORTED_TYPE";

/** Files that SheetJS can meaningfully DOM-parse. */
const SUPPORTED_SPREADSHEET_RE = /\.(xlsx|xlsm|xls|csv|tsv)$/i;

/** Legacy broader regex kept for backward-compat references. */
const SPREADSHEET_RE = /\.(xlsx|xlsm|xls|csv|tsv|pdf|txt)$/i;

/** Above this decoded size we skip SheetJS entirely and only regex-scan. */
const MAX_PARSE_BYTES = 2 * 1024 * 1024;

/** Hard ceiling — files above this are never scanned at all. */
const MAX_ABSOLUTE_BYTES = 30 * 1024 * 1024;

/** Decode Gmail's URL-safe base64 (`-` -> `+`, `_` -> `/`) into a Buffer. */
function decodeGmailBase64(base64String: string): Buffer {
  const normalized = base64String.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

/**
 * Best-effort plain-text extraction from spreadsheet & document attachments.
 *
 * Returns both the extracted text AND an `AttachmentStatus` so callers can
 * persist audit metadata into `alert_logs`.
 *
 * Route logic:
 *  1. Unsupported file type  → SKIPPED_UNSUPPORTED_TYPE
 *  2. Size > 30 MB           → SKIPPED_EXCEEDED_SIZE
 *  3. Size > 2 MB ≤ 30 MB    → RAW_SCANNED  (regex-only)
 *  4. Size ≤ 2 MB            → PARSED       (full SheetJS + regex)
 */
export async function extractAttachmentText(
  filename: string,
  base64Data: string,
): Promise<{ text: string; status: AttachmentStatus }> {
  if (!base64Data) {
    console.log(`[Extractor] No payload provided for "${filename}"`);
    return { text: "", status: "SKIPPED_UNSUPPORTED_TYPE" };
  }

  // ---- Gate 1: file-type check
  if (!SUPPORTED_SPREADSHEET_RE.test(filename)) {
    console.log(
      `[Extractor] "${filename}" is not a supported spreadsheet — SKIPPED_UNSUPPORTED_TYPE`,
    );
    return { text: "", status: "SKIPPED_UNSUPPORTED_TYPE" };
  }

  let buffer: Buffer | null;
  try {
    buffer = decodeGmailBase64(base64Data);
  } catch (err) {
    console.error(`[Gmail Webhook Error]: Base64 decode failed for attachment "${filename}":`, err);
    return { text: "", status: "SKIPPED_UNSUPPORTED_TYPE" };
  }
  console.log(`[Extractor] "${filename}" decoded ${buffer.length} bytes`);

  // ---- Gate 2: absolute size ceiling
  if (buffer.length > MAX_ABSOLUTE_BYTES) {
    console.warn(
      `[Extractor] "${filename}" is ${buffer.length} bytes (> ${MAX_ABSOLUTE_BYTES}) — SKIPPED_EXCEEDED_SIZE`,
    );
    buffer = null;
    return { text: "", status: "SKIPPED_EXCEEDED_SIZE" };
  }

  let fullText = "";
  const tooLargeForParse = buffer.length > MAX_PARSE_BYTES;
  const status: AttachmentStatus = tooLargeForParse ? "RAW_SCANNED" : "PARSED";

  if (tooLargeForParse) {
    console.warn(
      `[Extractor] "${filename}" is ${buffer.length} bytes (> ${MAX_PARSE_BYTES}) — skipping SheetJS parse, regex-only scan (RAW_SCANNED).`,
    );
  }

  // 1) SheetJS parse — every sheet, no row/column skipping (small files only).
  if (!tooLargeForParse) {
    let workbook: XLSX.WorkBook | null = null;
    try {
      workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: false,
        raw: true,
        sheetStubs: true,
        dense: true,
        cellFormula: false,
        cellHTML: false,
        cellStyles: false,
      });
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        fullText += " " + XLSX.utils.sheet_to_csv(sheet, { blankrows: true, skipHidden: false });
        fullText += " " + XLSX.utils.sheet_to_txt(sheet, { blankrows: true, skipHidden: false });
      }
    } catch (err) {
      if (SUPPORTED_SPREADSHEET_RE.test(filename)) {
        console.error(
          `[Gmail Webhook Error]: SheetJS parsing error for spreadsheet "${filename}":`,
          err,
        );
      }
    } finally {
      // Release the parsed workbook graph for GC before the raw scan.
      workbook = null;
    }
  }

  // 2) Raw binary/UTF-8 regex fallback.
  try {
    const rawStr = buffer.toString("binary");
    const tokens = rawStr.match(/[A-Za-z0-9]{3,64}/g) || [];
    fullText += " " + tokens.join(" ");
    const utf8Tokens = buffer.toString("utf-8").match(/[A-Za-z0-9]{3,64}/g) || [];
    fullText += " " + utf8Tokens.join(" ");
  } catch (err) {
    console.error(`[Gmail Webhook Error]: Raw scan failed for attachment "${filename}":`, err);
  }

  // Drop the decoded buffer reference to assist GC.
  buffer = null;

  console.log(
    `[Extractor] "${filename}" total extracted ${fullText.length} chars — status ${status}`,
  );
  return { text: fullText, status };
}

/* --------------------------------------------------------- normalizing */

/** Uppercase + strip every non-alphanumeric character. */
export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/** Accepts arrays, comma-separated strings, or single values. */
export function normalizeKeywords(keywords: unknown): string[] {
  const raw: unknown[] = Array.isArray(keywords)
    ? keywords
    : typeof keywords === "string"
      ? keywords.split(",")
      : keywords == null
        ? []
        : [keywords];

  const out: string[] = [];
  for (const item of raw) {
    for (const part of String(item ?? "").split(",")) {
      const clean = normalizeText(part);
      if (clean) out.push(clean);
    }
  }
  return Array.from(new Set(out));
}

/** Check keyword match against haystack supporting operator rules. */
export function matchKeyword(haystack: string, keyword: string, operator?: string): boolean {
  if (!keyword) return false;
  const op = (operator ?? "contains").toLowerCase();

  const normHaystack = normalizeText(haystack);
  const normKeyword = normalizeText(keyword);

  if (op === "exact" || op === "equals") {
    return normHaystack === normKeyword;
  }
  if (op === "regex") {
    try {
      const re = new RegExp(keyword, "i");
      return re.test(haystack);
    } catch {
      return normHaystack.includes(normKeyword);
    }
  }
  if (op === "starts_with" || op === "startswith") {
    return normHaystack.startsWith(normKeyword);
  }
  if (op === "ends_with" || op === "endswith") {
    return normHaystack.endsWith(normKeyword);
  }
  // Default: contains
  return normHaystack.includes(normKeyword);
}

/** Which fields a rule should scan (supports scan_sources / targets / target). */
function ruleTargets(rule: any): string[] {
  const raw = rule?.scan_sources ?? rule?.targets ?? rule?.target;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const norm = list.map((t: any) => String(t).toLowerCase());
  return norm.length ? norm : ["subject", "body", "attachments"];
}

function preview(haystack: string, keyword: string) {
  const idx = haystack.toUpperCase().indexOf(keyword.toUpperCase());
  const start = Math.max(0, idx - 120);
  return haystack.slice(start, start + 400).trim();
}

/* ---------------------------------------------------------- ai summary & formatter */

export interface EvaluatedEmailSummary {
  matched_user: boolean; // True if user's keywords/identifiers were explicitly matched
  is_actionable: boolean; // True if the user needs to take action or attend something
  status_headline: string; // One clear, definitive verdict sentence (e.g., "Not shortlisted for Nielsen PPT")
  detected_entity?: string; // Extracted company/organization/entity name (e.g., "Nielsen", "Amazon", "Placement Cell")
  key_details?: Array<{ label: string; value: string }>; // Action details (e.g., Venue, Date/Time, Requirements, Amount)
  action_items?: string[]; // List of next steps required by the user
}

/** Escape HTML special characters for Telegram HTML parse mode. */
export function escapeHtml(text: string): string {
  if (!text) return "";
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function generateEvaluatedEmailSummary(
  email: IncomingEmail,
  userKeywords: string[],
  ruleName: string,
): Promise<EvaluatedEmailSummary | null> {
  const { generateContentWithFallback } = await import("@/lib/rag.server");

  const keywordText = userKeywords.length
    ? userKeywords.map((k) => `"${k}"`).join(", ")
    : "None specified";

  const attachmentInfo = (email.attachments ?? [])
    .map((a) => (a.filename ? `File: ${a.filename}` : ""))
    .filter(Boolean)
    .join("\n");

  const prompt = `You are an intelligent email notification evaluator. Analyze this incoming email against target user keywords/identifiers and produce a structured JSON verdict.

Target Keywords/Identifiers to check: ${keywordText}
Rule Name Context: "${ruleName}"

Subject: ${email.subject}
From: ${email.sender}

Email Content:
${email.body.slice(0, 3500)}
${attachmentInfo ? `\nAttachment Info:\n${attachmentInfo}` : ""}

Evaluate the email and return ONLY a raw JSON object (no markdown wrap, no markdown code block) matching this schema:
{
  "matched_user": boolean,
  "is_actionable": boolean,
  "status_headline": "One clear, definitive verdict sentence.",
  "detected_entity": "Company, organization, institution, or project/placement cell name extracted from subject/body (e.g. 'Nielsen', 'Amazon', 'Placement Cell'). Do NOT return raw email addresses.",
  "key_details": [
    { "label": "Venue / Date / Amount / etc", "value": "Details" }
  ],
  "action_items": [
    "Required action step"
  ]
}

Instructions:
1. "matched_user": Set to true ONLY if any target keywords explicitly match or pertain to the user. Set to false if the user was NOT selected or matched.
2. "is_actionable": Set to true if the email requires action, attendance, payment, or response. Set to false if non-actionable or informational only.
3. "status_headline": Exactly ONE clear, direct sentence summarizing the verdict.
4. "detected_entity": Clean entity/company/institution name mentioned in the subject/body. Do NOT output raw email addresses.
5. "key_details": Array of label/value objects for actionable details (Venue, Date/Time, Requirements, Amount).
6. "action_items": Array of clear next steps required by the user. If no action is needed, use empty array [].`;

  try {
    const { response: res } = await generateContentWithFallback({
      contents: prompt,
      config: {
        systemInstruction:
          "You are a precise email notification evaluator that returns strict JSON responses.",
        responseMimeType: "application/json",
      },
    });

    const rawContent = res.text?.trim() || "";

    const cleanJson = rawContent
      .replace(/^```(json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleanJson) as EvaluatedEmailSummary;

    return {
      matched_user: Boolean(parsed.matched_user),
      is_actionable: Boolean(parsed.is_actionable),
      status_headline: String(parsed.status_headline || "").trim(),
      detected_entity: parsed.detected_entity ? String(parsed.detected_entity).trim() : undefined,
      key_details: Array.isArray(parsed.key_details) ? parsed.key_details : [],
      action_items: Array.isArray(parsed.action_items) ? parsed.action_items : [],
    };
  } catch (err: any) {
    console.error(
      "[LLM Evaluator] Error generating structured email summary:",
      err?.message ?? err,
    );
    return null;
  }
}

/** Legacy summary helper wrapper for backwards compatibility. */
async function generateAiSummary(emailBody: string): Promise<string> {
  const summary = await generateEvaluatedEmailSummary(
    { subject: "", sender: "", body: emailBody, attachments: [] },
    [],
    "Email Summary",
  );
  return summary?.status_headline || "";
}

export interface EvaluationContext {
  subject: string;
  sender: string;
  receivedAt?: string;
  detectedEntity?: string;
  cleanSubject?: string;
  oneSentenceSummary?: string;
  detailedSummary?: string;
  attachmentName?: string;
  negative?: boolean;
}

export function formatDate(dateVal?: string | Date): string {
  if (!dateVal)
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  try {
    const d = new Date(dateVal);
    return isNaN(d.getTime())
      ? String(dateVal)
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return String(dateVal);
  }
}

export function cleanSubjectFallback(subject: string): string {
  if (!subject) return "";
  let clean = subject
    .replace(/^(fwd|fw|re|reply|forward):\s*/i, "")
    .replace(/^\[(cdc|placement|notice|alert|important)\]\s*/i, "")
    .trim();
  clean = clean.replace(/^(fwd|fw|re|reply|forward):\s*/i, "").trim();
  return clean || subject;
}

export function extractEntityFallback(subject: string, body: string, sender: string): string {
  const cleanSubj = cleanSubjectFallback(subject);

  // Match company/institution name at the start of clean subject before keywords like PPT, Shortlist, Drive, etc.
  const match = cleanSubj.match(
    /^([A-Za-z0-9\s&.-]+?)\s+(?:PPT|Shortlisting|Shortlist|Drive|Placement|Interview|Hiring|Test|Notice|Sheet|List|202\d|\d{4})\b/i,
  );
  if (match && match[1] && match[1].trim().length > 1) {
    const candidate = match[1].trim();
    if (!candidate.includes("@")) {
      return candidate;
    }
  }

  // Check first word/brand of clean subject
  const words = cleanSubj.split(/\s+/);
  if (words.length > 0 && words[0] && words[0].length > 1 && !words[0].includes("@")) {
    const firstWord = words[0].replace(/[^A-Za-z0-9]/g, "");
    if (
      firstWord.length > 1 &&
      !["the", "a", "an", "all", "new", "urgent", "update"].includes(firstWord.toLowerCase())
    ) {
      return firstWord;
    }
  }

  return cleanSubj || sender.replace(/<.*?>/, "").trim();
}

export function buildTelegramMessage(rule: any, ctx: EvaluationContext): string {
  const formattedDate = formatDate(ctx.receivedAt);
  const ruleName = rule.rule_name || rule.name || "";
  const isShortlistRule = Boolean(
    rule.notify_on_missing_keyword || ruleName.toLowerCase().includes("shortlist"),
  );
  const isMatch = !ctx.negative;

  // Use detected entity/company name if available, fallback to cleaned subject
  const entityName = ctx.detectedEntity || ctx.cleanSubject || cleanSubjectFallback(ctx.subject);

  // 1. DEFAULT MINIMAL HEADLINE
  let message = `**Received:** ${formattedDate}\n`;

  if (isShortlistRule) {
    const shortlistStatus = isMatch ? "you ARE shortlisted 🎉" : "you ARE NOT shortlisted ❌";
    message += `**Info:** This is to notify you about a shortlisting sheet from **${entityName}** and ${shortlistStatus}.\n`;
  } else {
    const summaryStr = ctx.oneSentenceSummary || "a new email update was received.";
    message += `**Info:** This is to notify you about an email regarding **${entityName}** stating: ${summaryStr}\n`;
  }

  // 2. OPTIONAL USER-CHECKED SECTIONS
  const extras: string[] = [];

  if (rule.tg_show_subject) {
    extras.push(`• **Subject:** ${ctx.subject}`);
  }
  if (rule.tg_show_sender) {
    extras.push(`• **From:** ${ctx.sender}`);
  }
  if (rule.tg_show_match_details) {
    const kwList = Array.isArray(rule.keywords)
      ? rule.keywords.join(", ")
      : String(rule.keywords || "");
    extras.push(`• **Keywords:** ${kwList} (${isMatch ? "MATCHED" : "NOT MATCHED"})`);
  }
  if (rule.tg_show_scanned_file && ctx.attachmentName) {
    extras.push(`• **Scanned File:** ${ctx.attachmentName}`);
  }
  if (rule.tg_show_detailed_summary && ctx.detailedSummary) {
    extras.push(`\n**Summary:**\n${ctx.detailedSummary}`);
  }

  if (extras.length > 0) {
    message += `\n---\n` + extras.join("\n");
  }

  return message;
}

/**
 * Format a dynamic, context-aware Telegram notification payload.
 * Suppresses venue/timing/action clutter when non-actionable or non-matched.
 */
export function formatTelegramPayload(
  ruleName: string,
  emailMeta: { subject: string; sender: string; date?: string },
  summary: EvaluatedEmailSummary | null,
  userKeywords: string[],
  fallbackText?: { hit?: RuleHit; negative?: boolean },
): string {
  const safeRuleName = escapeHtml(ruleName);
  const safeSubject = escapeHtml(emailMeta.subject || "(no subject)");
  const safeSender = escapeHtml(emailMeta.sender || "(unknown)");
  const safeDate = escapeHtml(emailMeta.date || new Date().toLocaleString());
  const keywordsList = userKeywords.length ? userKeywords.join(", ") : "";
  const safeKeywords = escapeHtml(keywordsList);

  const isMatched = summary ? summary.matched_user : !fallbackText?.negative;
  const isActionable = summary ? summary.is_actionable : isMatched;
  const isFullAlert = isMatched || isActionable;

  const headline = summary?.status_headline
    ? escapeHtml(summary.status_headline)
    : fallbackText?.negative
      ? `Notice received for <code>${safeKeywords || "topic"}</code>, but your target keywords were NOT found.`
      : `Matched <code>${escapeHtml(fallbackText?.hit?.keyword || "")}</code> in ${escapeHtml(fallbackText?.hit?.source || "email")}`;

  if (!isFullAlert) {
    // Noise-Reduction / Status-Only Alert
    let payload = `⚠️ <b>${safeRuleName}</b> [Status Alert]\n\n`;
    payload += `📌 <b>Verdict:</b> ${headline}\n\n`;
    payload += `<b>From:</b> ${safeSender}\n`;
    payload += `<b>Subject:</b> ${safeSubject}\n`;
    if (safeKeywords) {
      payload += `<b>Keywords Searched:</b> <code>${safeKeywords}</code> (Not Matched)\n`;
    }
    payload += `<b>Date:</b> ${safeDate}`;
    return payload.trim();
  }

  // Full Actionable Alert
  let payload = `🔔 <b>${safeRuleName}</b>\n\n`;
  payload += `📌 <b>Headline:</b> ${headline}\n\n`;
  payload += `<b>From:</b> ${safeSender}\n`;
  payload += `<b>Subject:</b> ${safeSubject}\n`;
  payload += `<b>Date:</b> ${safeDate}\n`;

  if (summary?.key_details && summary.key_details.length > 0) {
    payload += `\n📋 <b>Key Details:</b>\n`;
    for (const item of summary.key_details) {
      if (item.label && item.value) {
        payload += `• <b>${escapeHtml(item.label)}:</b> ${escapeHtml(item.value)}\n`;
      }
    }
  }

  if (summary?.action_items && summary.action_items.length > 0) {
    payload += `\n✅ <b>Action Required:</b>\n`;
    for (const action of summary.action_items) {
      if (action) {
        payload += `• ${escapeHtml(action)}\n`;
      }
    }
  }

  if (payload.length > 4000) {
    payload = payload.slice(0, 3950) + "\n\n<i>[Content truncated]</i>";
  }

  return payload.trim();
}

/* --------------------------------------------------------------- types */

export type IncomingAttachment = {
  filename: string;
  text?: string;
  base64?: string;
  data?: string;
  size?: number;
  mimeType?: string;
};

export type IncomingEmail = {
  subject: string;
  sender: string;
  body: string;
  date?: string;
  /** Gmail message id, used for alert deduplication. */
  gmailMessageId?: string | null;

  attachments: IncomingAttachment[];
};

export type RuleHit = {
  keyword: string;
  source: string;
  filename?: string;
  text: string;
};

/* ------------------------------------------------------- field builder */

/** Extended field entry — carries optional attachment audit metadata. */
export type FieldEntry = {
  source: string;
  filename?: string;
  text: string;
  attachmentStatus?: AttachmentStatus;
  attachmentSize?: number;
};

/** Build the searchable fields for a rule, extracting attachment text once. */
async function buildFields(
  rule: any,
  email: IncomingEmail,
  attachmentCache: Map<string, { text: string; status: AttachmentStatus }>,
): Promise<FieldEntry[]> {
  const targets = ruleTargets(rule);
  const fields: FieldEntry[] = [];

  if (targets.includes("subject")) fields.push({ source: "subject", text: email.subject ?? "" });
  if (targets.includes("sender")) fields.push({ source: "sender", text: email.sender ?? "" });
  if (targets.includes("body")) fields.push({ source: "body", text: email.body ?? "" });

  if (targets.includes("attachments")) {
    for (const att of email.attachments ?? []) {
      const filename = att.filename ?? "";
      if (!filename) continue;

      const payload = att.base64 || att.data || "";
      // Rough decoded size — used to log/flag oversized attachments early.
      const approxBytes = att.size ?? Math.floor((payload.length * 3) / 4);

      const cacheKey = `${filename}:${payload.length}`;
      let cached = attachmentCache.get(cacheKey);

      if (!cached) {
        if (att.text !== undefined) {
          // Pre-extracted text (e.g. from Gmail snippet) — mark as PARSED.
          cached = { text: att.text, status: "PARSED" as AttachmentStatus };
        } else {
          cached = await extractAttachmentText(filename, payload);
        }
        attachmentCache.set(cacheKey, cached);
      }

      fields.push({
        source: "attachment",
        filename,
        text: cached.text,
        attachmentStatus: cached.status,
        attachmentSize: approxBytes,
      });
    }
  }

  return fields;
}

/** Extended rule hit — carries optional attachment audit metadata. */
export type ExtendedRuleHit = RuleHit & {
  attachmentStatus?: AttachmentStatus;
  attachmentSize?: number;
};

/** Find the first keyword hit for a rule across its target fields. */
async function findHit(
  rule: any,
  email: IncomingEmail,
  attachmentCache: Map<string, { text: string; status: AttachmentStatus }>,
): Promise<ExtendedRuleHit | null> {
  const keywords = normalizeKeywords(rule?.keywords);
  if (!keywords.length) return null;

  const fields = await buildFields(rule, email, attachmentCache);

  for (const keyword of keywords) {
    for (const field of fields) {
      if (matchKeyword(field.text, keyword, rule?.operator)) {
        console.log(
          `[Rule Match] "${rule.rule_name ?? rule.name ?? rule.id}" matched "${keyword}" in ${field.source}${field.filename ? ` (${field.filename})` : ""}`,
        );
        return {
          keyword,
          source: field.source,
          filename: field.filename,
          text: field.text,
          attachmentStatus: field.attachmentStatus,
          attachmentSize: field.attachmentSize,
        };
      }
    }
  }
  return null;
}

/**
 * Does this email belong to the rule's target topic (subject/body/attachments)?
 * Used by the "notify when my keyword is missing" negative-match mode.
 */
async function findTopicHit(
  rule: any,
  email: IncomingEmail,
  attachmentCache: Map<string, { text: string; status: AttachmentStatus }>,
): Promise<ExtendedRuleHit | null> {
  const topics = normalizeKeywords(rule?.topic_keywords);
  if (!topics.length) return null;

  const fields = await buildFields(rule, email, attachmentCache);
  const extra: FieldEntry[] = [
    { source: "subject", text: email.subject ?? "" },
    { source: "body", text: email.body ?? "" },
  ];
  const all = [...fields, ...extra];

  for (const topic of topics) {
    for (const field of all) {
      if (matchKeyword(field.text, topic, "contains")) {
        return {
          keyword: topic,
          source: field.source,
          filename: field.filename,
          text: field.text,
          attachmentStatus: field.attachmentStatus,
          attachmentSize: field.attachmentSize,
        };
      }
    }
  }
  return null;
}

/* ---------------------------------------------------------- alerting */

/** Dedup window for repeated alerts on the same (workspace, message, rule). */
const DEDUP_WINDOW_MS = 15 * 60 * 1000;

/**
 * Persist the match into `alert_logs` and push a Telegram notification.
 * Idempotent per Gmail message id within a 15 minute window.
 */
export async function triggerRuleAlert(
  rule: any,
  email: IncomingEmail,
  ctx: {
    supabase: any;
    workspaceId: string;
    hit: ExtendedRuleHit;
    userId?: string;
    /** Negative match: topic matched but the target keyword was absent. */
    negative?: boolean;
    missingKeywords?: string[];
    /** Gmail message id — used for alert deduplication. */
    gmailMessageId?: string | null;
  },
) {
  const { supabase, workspaceId, hit, negative } = ctx;
  const gmailMessageId = ctx.gmailMessageId ?? null;
  const targetUserId =
    rule.user_id || ctx.userId || (await getWorkspaceUserId(supabase, workspaceId));

  const ruleName = rule.rule_name ?? rule.name ?? rule.id ?? "Alert";
  console.log("[Automations Debug] Evaluating rule:", {
    ruleId: rule.id,
    userId: targetUserId,
    ruleName,
    gmailMessageId,
  });

  // ---- Idempotency: skip if we already alerted for this message+rule recently.
  if (gmailMessageId) {
    try {
      const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
      const { data: existing } = await supabase
        .from("alert_logs")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("gmail_message_id", gmailMessageId)
        .eq("rule_id", rule.id ?? null)
        .gt("triggered_at", since)
        .limit(1);
      if (existing && existing.length > 0) {
        console.log(
          `[Rule Engine] Duplicate alert suppressed for message ${gmailMessageId} / rule ${rule.id} (within 15m).`,
        );
        return null;
      }
    } catch (dedupErr: any) {
      console.error("[Rule Engine] Dedup lookup failed:", dedupErr?.message ?? dedupErr);
    }
  }

  const ruleKeywords = normalizeKeywords(rule?.keywords);
  const missingKeywords = ctx.missingKeywords ?? ruleKeywords;
  const missing = missingKeywords.join(", ");

  let summaryObj: EvaluatedEmailSummary | null = null;
  if (rule.ai_summarize !== false && email.body) {
    summaryObj = await generateEvaluatedEmailSummary(email, ruleKeywords, ruleName);
  }

  let notificationStatus = "SKIPPED";
  const shouldNotifyTelegram = (rule.send_telegram_alert ?? rule.notify_telegram) !== false;
  // Allow Telegram dispatch on negative matches ONLY if rule.notify_on_missing_keyword is enabled.
  const shouldDispatchTelegram =
    shouldNotifyTelegram && targetUserId && (!negative || rule.notify_on_missing_keyword);

  if (shouldDispatchTelegram) {
    const cleanSubj = cleanSubjectFallback(email.subject);
    const detectedEntity =
      summaryObj?.detected_entity || extractEntityFallback(email.subject, email.body, email.sender);
    const attachmentName = hit.filename ?? (email.attachments?.[0]?.filename || undefined);

    const evalCtx: EvaluationContext = {
      subject: email.subject,
      sender: email.sender,
      receivedAt: email.date,
      detectedEntity,
      cleanSubject: cleanSubj,
      oneSentenceSummary:
        summaryObj?.status_headline ||
        (negative ? "Target keyword missing" : `Matched keyword: ${hit.keyword}`),
      detailedSummary: summaryObj?.action_items?.length
        ? summaryObj.action_items.join("\n")
        : (summaryObj?.status_headline ?? undefined),
      attachmentName,
      negative: !!negative,
    };

    const text = buildTelegramMessage(rule, evalCtx);

    const res = await sendTelegramNotification(supabase, targetUserId, text);
    notificationStatus = res.status;
  } else if (negative) {
    console.log(
      `[Rule Engine] Negative match for "${ruleName}" — notify_on_missing_keyword=${!!rule.notify_on_missing_keyword}, notification_status=SKIPPED.`,
    );
  } else if (!targetUserId) {
    console.warn(
      `[Rule Engine] Skipping Telegram for rule "${ruleName}": Could not resolve user_id`,
    );
  }

  console.log(
    `[Rule Engine] Triggering alert for rule: ${ruleName} User: ${targetUserId ?? "(unknown)"} Status: ${notificationStatus}`,
  );

  const aiSummaryValue = summaryObj ? JSON.stringify(summaryObj) : null;

  // Resolve attachment audit metadata from the hit (if the match came from an attachment).
  const attachmentName = hit.filename ?? (email.attachments?.[0]?.filename || null);
  const attachmentSize = hit.attachmentSize ?? (email.attachments?.[0]?.size || null);
  const attachmentStatusVal = hit.attachmentStatus ?? null;

  const { data: log, error } = await supabase
    .from("alert_logs")
    .insert({
      rule_id: rule.id ?? null,
      workspace_id: workspaceId,
      gmail_message_id: gmailMessageId,
      email_subject: email.subject || "(no subject)",
      sender_email: email.sender || "(unknown)",
      matched_keyword: negative ? `NOT FOUND: ${missing || hit.keyword}` : hit.keyword,
      matched_source: negative ? `missing (${hit.source})` : hit.source,
      source_filename: hit.filename ?? null,
      extracted_preview: preview(hit.text, hit.keyword),
      ai_summary: aiSummaryValue,
      notification_status: notificationStatus,
      attachment_name: attachmentName,
      attachment_size: attachmentSize,
      attachment_status: attachmentStatusVal,
    })
    .select()
    .single();

  if (error) {
    console.error(`Error inserting alert log for rule ${rule.id}:`, error.message);
    return null;
  }
  return log;
}

/* -------------------------------------------------------- evaluation */

/**
 * Run one rule against one email.
 * - keyword found            -> positive alert
 * - keyword missing + topic  -> negative "not shortlisted" alert (opt-in)
 */
export async function processRuleForEmail(
  rule: any,
  email: IncomingEmail,
  ctx: {
    supabase: any;
    workspaceId: string;
    userId?: string;
    attachmentCache?: Map<string, { text: string; status: AttachmentStatus }>;
    gmailMessageId?: string | null;
  },
): Promise<any | null> {
  if (rule?.is_active === false) {
    return null;
  }

  const gmailMessageId = ctx.gmailMessageId ?? email.gmailMessageId ?? null;
  const cache =
    ctx.attachmentCache ?? new Map<string, { text: string; status: AttachmentStatus }>();
  const hit = await findHit(rule, email, cache);
  if (hit) {
    return triggerRuleAlert(rule, email, {
      supabase: ctx.supabase,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      gmailMessageId,
      hit,
    });
  }

  const notifyOnMissing =
    rule?.notify_if_missing ?? rule?.notify_if_keyword_not_found ?? rule?.notify_on_missing_keyword;
  if (!notifyOnMissing) return null;

  const topicHit = await findTopicHit(rule, email, cache);
  if (!topicHit) return null;

  console.log(
    `[Rule Negative Match] "${rule.rule_name ?? rule.name ?? rule.id}" topic "${topicHit.keyword}" matched but keywords absent`,
  );
  return triggerRuleAlert(rule, email, {
    supabase: ctx.supabase,
    workspaceId: ctx.workspaceId,
    userId: ctx.userId,
    gmailMessageId,
    hit: topicHit,
    negative: true,
    missingKeywords: Array.isArray(rule?.keywords)
      ? rule.keywords.map((k: any) => String(k))
      : normalizeKeywords(rule?.keywords),
  });
}

/**
 * Evaluate one email against the workspace's active rules.
 * Every rule is checked; a match logs an alert and fires Telegram.
 */
export async function evaluateEmail(
  supabase: any,
  workspaceId: string,
  email: IncomingEmail,
  cached?: { rules?: any[]; ws?: any } | null,
  gmailMessageId?: string | null,
): Promise<{ matched: number; logs: any[] }> {
  let rules = cached?.rules;
  if (!rules) {
    const { data, error } = await supabase
      .from("alert_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    rules = data ?? [];
  }

  const userId =
    cached?.ws?.user_id || (await getWorkspaceUserId(supabase, workspaceId)) || undefined;
  const attachmentCache = new Map<string, { text: string; status: AttachmentStatus }>();
  const created: any[] = [];
  const messageId = gmailMessageId ?? email.gmailMessageId ?? null;

  for (const rule of rules ?? []) {
    if (rule?.is_active === false) continue;
    console.log("[Automations Debug] Evaluating rule:", {
      ruleId: rule.id,
      userId: rule.user_id || userId,
    });
    try {
      const log = await processRuleForEmail(rule, email, {
        supabase,
        workspaceId,
        userId: rule.user_id || userId,
        attachmentCache,
        gmailMessageId: messageId,
      });
      if (log) created.push(log);
    } catch (ruleErr: any) {
      console.error(`Rule processing failed for ${rule?.id}: ${ruleErr?.message ?? ruleErr}`);
    }
  }

  return { matched: created.length, logs: created };
}

/**
 * Evaluate a single rule against a single email (boolean helper).
 */
export async function evaluateRuleAgainstEmail(rule: any, email: IncomingEmail): Promise<boolean> {
  const hit = await findHit(rule, email, new Map());
  return hit !== null;
}

/* ------------------------------------------------------- orchestrator */

/**
 * Full pipeline: pull the latest Gmail messages, load the workspace's active
 * rules once, then explicitly evaluate EVERY email against EVERY active rule.
 * Never returns early — per-item failures are logged and the loop continues.
 */
export async function runRulesOnLatestEmails(
  supabase: any,
  workspaceId: string,
  userId: string,
  limit = 10,
): Promise<{
  emailsScanned: number;
  rulesEvaluated: number;
  matched: number;
  logs: any[];
}> {
  const { fetchGmailInboxDirect } = await import("./gmail.server");

  const [emails, rulesRes] = await Promise.all([
    fetchGmailInboxDirect(userId, limit),
    supabase.from("alert_rules").select("*").eq("workspace_id", workspaceId).eq("is_active", true),
  ]);

  if (rulesRes.error) throw new Error(rulesRes.error.message);
  const rules: any[] = rulesRes.data ?? [];

  console.log(
    `[Automations] Scanning ${emails.length} emails against ${rules.length} active rules`,
  );

  const logs: any[] = [];

  for (const msg of emails) {
    const email: IncomingEmail = {
      subject: msg.subject ?? "",
      sender: msg.fromEmail || msg.from || "",
      body: msg.body ?? "",
      date: msg.date ?? "",
      gmailMessageId: (msg as any).id ?? null,
      attachments: (msg.attachments ?? []).map((a) => ({
        filename: a.filename,
        base64: a.base64,
        size: a.size,
      })),
    };

    const attachmentCache = new Map<string, { text: string; status: AttachmentStatus }>();

    for (const rule of rules) {
      try {
        const log = await processRuleForEmail(rule, email, {
          supabase,
          workspaceId,
          userId,
          attachmentCache,
          gmailMessageId: email.gmailMessageId,
        });
        if (log) logs.push(log);
      } catch (err: any) {
        console.error(
          `[Automations] Rule "${rule?.rule_name ?? rule?.id}" failed on "${email.subject}": ${err?.message ?? err}`,
        );
      }
    }
  }

  return {
    emailsScanned: emails.length,
    rulesEvaluated: rules.length,
    matched: logs.length,
    logs,
  };
}

/**
 * Evaluate an explicit set of Gmail messages (used by the push-notification
 * webhook) against every active rule of a workspace.
 */
export async function runRulesOnMessages(
  supabase: any,
  workspaceId: string,
  messages: {
    id?: string;
    subject?: string;
    fromEmail?: string;
    from?: string;
    body?: string;
    date?: string;
    attachments?: { filename: string; base64?: string; size?: number }[];
  }[],
): Promise<{ emailsScanned: number; matched: number; logs: any[] }> {
  const { data: rulesData, error: rulesErr } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true);
  if (rulesErr) throw new Error(rulesErr.message);
  const rules: any[] = rulesData ?? [];

  const userId = (await getWorkspaceUserId(supabase, workspaceId)) || undefined;

  const logs: any[] = [];
  for (const msg of messages) {
    const email: IncomingEmail = {
      subject: msg.subject ?? "",
      sender: msg.fromEmail || msg.from || "",
      body: msg.body ?? "",
      date: msg.date ?? "",
      gmailMessageId: msg.id ?? null,
      attachments: (msg.attachments ?? []).map((a) => ({
        filename: a.filename,
        base64: a.base64,
        size: a.size,
      })),
    };
    const attachmentCache = new Map<string, { text: string; status: AttachmentStatus }>();
    for (const rule of rules) {
      try {
        const log = await processRuleForEmail(rule, email, {
          supabase,
          workspaceId,
          userId: rule.user_id || userId,
          attachmentCache,
          gmailMessageId: email.gmailMessageId,
        });

        if (log) logs.push(log);
      } catch (err: any) {
        console.error(
          `[Automations/webhook] Rule "${rule?.rule_name ?? rule?.id}" failed: ${err?.message ?? err}`,
        );
      }
    }
  }

  return { emailsScanned: messages.length, matched: logs.length, logs };
}
