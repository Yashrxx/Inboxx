/**
 * Lead capture + scoring logic (server-only).
 *
 * Called from the public chat endpoint AFTER each completed conversation
 * turn. Uses Gemini to produce:
 *   - a 1-2 line summary of the lead
 *   - a score 0-100
 *   - a category (cold | warm | hot)
 *   - an extracted name/contact, if the customer has shared them
 *
 * Scoring is an ASSIST that sorts leads — never a gate. Humans see every
 * lead, regardless of score. The lead is upserted by session_id so each
 * chat conversation maps to ONE lead row.
 *
 * Handoff flag rules (see flagNeedsHumanFromTurn): the lead's status is
 * flipped to 'needs_human' when ANY of the following is true:
 *   - the customer asks about price / cost / quotation
 *   - the customer explicitly asks for a human ("talk to someone", "call me")
 *   - the assistant's answer was confidence_flag=true (bot unsure)
 *   - the lead's scored category is 'hot'
 *
 * Statuses 'handed_over', 'converted', and 'dead' are terminal and are
 * never overwritten by automatic scoring.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateContentWithFallback } from "@/lib/rag.server";

type Turn = { role: "user" | "assistant"; content: string };

const SCORING_PROMPT = `You are a sales lead analyser.

Given the conversation transcript below, return STRICT JSON with these fields:
{
  "summary": "1-2 line plain-English summary of who they are and what they want",
  "score": integer 0-100,
  "category": "cold" | "warm" | "hot",
  "name": "extracted customer name if shared, else null",
  "contact": "email or phone number if shared, else null"
}

Scoring signals:
- single vague question, just browsing → low (0-25, cold)
- asked specs / machine type / capacity → medium (30-55, warm)
- asked pricing / quotation / delivery → high (60-80, warm-to-hot)
- mentioned quantity, timeline, site, or budget → very high (75-95, hot)
- multiple follow-ups + concrete requirement → very high (80-100, hot)

Map score to category: 0-39 cold, 40-69 warm, 70-100 hot.

Return ONLY the JSON object. No markdown, no commentary.`;

interface ScoreResult {
  summary: string;
  score: number;
  category: "cold" | "warm" | "hot";
  name: string | null;
  contact: string | null;
}

async function scoreConversation(messages: Turn[]): Promise<ScoreResult | null> {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Customer" : "Company"}: ${m.content}`)
    .join("\n");

  try {
    const { response: res } = await generateContentWithFallback({
      contents: `Conversation:\n${transcript}`,
      config: {
        systemInstruction: SCORING_PROMPT,
        responseMimeType: "application/json",
        temperature: 1,
      },
    });

    const raw = res.text?.trim();
    if (!raw) return null;
    const cleanJson = raw
      .replace(/^```(json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleanJson);

    let calculatedScore = 0;
    const userTranscript = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content.toLowerCase())
      .join(" ");

    if (/(price|cost|budget|quote|quotation)/i.test(userTranscript)) calculatedScore += 25;
    if (/(quantity|units|pieces|bulk|order)/i.test(userTranscript)) calculatedScore += 20;
    if (/(timeline|delivery|urgent|when|deadline)/i.test(userTranscript)) calculatedScore += 20;
    if (
      /(specs|specifications|capacity|model|stainless|steel|washer|machine|system|kw|rpm|bar|lite|pro|dimension|size)/i.test(
        userTranscript,
      )
    )
      calculatedScore += 15;

    const userMsgCount = messages.filter((m) => m.role === "user").length;
    if (userMsgCount > 1) {
      calculatedScore += 10;
    }

    calculatedScore = Math.min(100, Math.max(0, calculatedScore));

    let calculatedCategory: "cold" | "warm" | "hot" = "cold";
    if (calculatedScore >= 51) calculatedCategory = "hot";
    else if (calculatedScore >= 21) calculatedCategory = "warm";

    return {
      summary: String(parsed?.summary ?? "").slice(0, 1000),
      score: calculatedScore,
      category: calculatedCategory,
      name: parsed?.name ? String(parsed.name).slice(0, 200) : null,
      contact: parsed?.contact ? String(parsed.contact).slice(0, 200) : null,
    };
  } catch (e) {
    console.error("lead scoring failed", e);
    return null;
  }
}

/**
 * Heuristic handoff triggers detected on the latest user turn + bot reply.
 * These run regardless of the AI scoring outcome.
 */
function flagNeedsHumanFromTurn(
  userText: string,
  lowConfidence: boolean,
  category: "cold" | "warm" | "hot",
): { needsHuman: boolean; reason: string | null } {
  const t = userText.toLowerCase();

  const priceWords = ["price", "pricing", "cost", "quote", "quotation", "how much", "budget"];
  const humanWords = [
    "talk to someone",
    "speak to someone",
    "talk to a human",
    "speak to a human",
    "call me",
    "ring me",
    "phone me",
    "contact me",
    "sales team",
    "real person",
  ];

  if (priceWords.some((w) => t.includes(w))) return { needsHuman: true, reason: "price/quotation" };
  if (humanWords.some((w) => t.includes(w))) return { needsHuman: true, reason: "asked for human" };
  if (lowConfidence) return { needsHuman: true, reason: "bot unsure" };
  if (category === "hot") return { needsHuman: true, reason: "hot lead" };
  return { needsHuman: false, reason: null };
}

/**
 * Upsert the lead for this chat session. Called after each turn completes.
 * Best-effort: failures are logged and swallowed (never break the chat).
 */
export async function captureChatLead(args: {
  sessionId: string;
  workspaceId: string;
  messages: Turn[];
  lastUserText: string;
  lowConfidence: boolean;
  source?: string | null;
  sourceDomain?: string | null;
}): Promise<void> {
  try {
    const scored = await scoreConversation(args.messages);

    // Fetch existing lead so we don't overwrite terminal statuses or
    // demote a stronger category from a previous turn.
    const { data: existing } = await supabaseAdmin
      .from("leads")
      .select("id, status, category, score, name, contact")
      .eq("session_id", args.sessionId)
      .eq("workspace_id", args.workspaceId)
      .maybeSingle();

    const category =
      scored?.category ?? (existing?.category as "cold" | "warm" | "hot" | undefined) ?? "cold";
    const score = scored?.score ?? existing?.score ?? 0;
    const summary = scored?.summary ?? null;

    const { needsHuman, reason } = flagNeedsHumanFromTurn(
      args.lastUserText,
      args.lowConfidence,
      category,
    );

    // Preserve terminal statuses.
    const terminal = ["handed_over", "converted", "dead"];
    const currentStatus = existing?.status ?? "bot_handling";
    let nextStatus = currentStatus;
    if (!terminal.includes(currentStatus)) {
      nextStatus = needsHuman ? "needs_human" : currentStatus;
    }

    const name = scored?.name && !existing?.name ? scored.name : undefined;
    const contact = scored?.contact && !existing?.contact ? scored.contact : undefined;

    if (existing) {
      await supabaseAdmin
        .from("leads")
        .update({
          channel: "chat",
          score,
          category,
          summary: summary ?? undefined,
          status: nextStatus,
          last_activity: new Date().toISOString(),
          ...(args.source ? { source: args.source } : {}),
          ...(args.sourceDomain ? { source_domain: args.sourceDomain } : {}),
          ...(name ? { name } : {}),
          ...(contact ? { contact } : {}),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("leads").insert({
        session_id: args.sessionId,
        workspace_id: args.workspaceId,
        channel: "chat",
        source: args.source ?? null,
        source_domain: args.sourceDomain ?? null,
        score,
        category,
        summary,
        status: nextStatus,
        last_activity: new Date().toISOString(),
        name: name ?? null,
        contact: contact ?? null,
      });
    }

    if (needsHuman) {
      console.log(`[lead] session ${args.sessionId} flagged needs_human: ${reason}`);
    }
  } catch (e) {
    console.error("captureChatLead failed", e);
  }
}

// TODO: WhatsApp + Gmail lead capture — call the same `scoreConversation`
// helper from those channels once their inbound pipelines are activated.
// Set `channel: 'whatsapp' | 'gmail'` and reuse a stable per-thread id as
// the session_id.
