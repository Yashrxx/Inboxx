/**
 * Server function that generates an email draft reply using the same
 * RAG + Gemini pipeline as the customer chat, then logs it as an
 * email_draft record so the admin can review/edit/send.
 *
 * TODO: connect Gmail inbox — when Gmail is wired up, an incoming email
 *       webhook should call this function with the message body, and the
 *       generated draft should be pushed back to Gmail as a draft reply
 *       instead of only being stored in the answer_logs table.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  incoming_email: z.string().min(1).max(20_000),
});

export const generateEmailDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { searchKb, buildContextBlock, generateContentWithFallback } =
      await import("@/lib/rag.server");
    const { EMAIL_SYSTEM_PROMPT, LOW_CONFIDENCE_PHRASES } = await import("@/lib/system-prompt");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { data: wsRow } = await supabaseAdmin
      .from("workspaces")
      .select("system_prompt")
      .eq("id", workspaceId)
      .maybeSingle();

    let systemPromptToUse = EMAIL_SYSTEM_PROMPT;
    if (wsRow?.system_prompt && wsRow.system_prompt.trim()) {
      systemPromptToUse = `${wsRow.system_prompt.trim()}\n\nRESPONSE FORMAT — EMAIL:\nWrite a full professional email reply with a greeting, body, and sign-off.`;
    }

    const matches = await searchKb(data.incoming_email, workspaceId, 5);
    const topSim = matches[0]?.similarity ?? 0;
    const contextBlock = buildContextBlock(matches);

    let truncatedEmail = data.incoming_email;
    if (truncatedEmail.length > 500) {
      truncatedEmail = truncatedEmail.substring(0, 500) + "... [truncated]";
    }

    const { response: res } = await generateContentWithFallback({
      contents: `Draft an email reply to the following customer enquiry. Use a professional, warm tone suitable for direct email. Sign off as the company.\n\n--- INCOMING EMAIL ---\n${truncatedEmail}`,
      config: {
        systemInstruction: `${systemPromptToUse}\n\n${contextBlock}`,
      },
    });

    const answer = res.text ?? "";

    const lowConfidence =
      topSim < 0.5 ||
      LOW_CONFIDENCE_PHRASES.some((p) => answer.toLowerCase().includes(p.toLowerCase()));

    const { data: log, error } = await supabaseAdmin
      .from("answer_logs")
      .insert({
        type: "email_draft",
        incoming_text: data.incoming_email,
        answer_text: answer,
        sources_used: matches.map((m) => ({
          filename: m.filename,
          similarity: m.similarity,
        })),
        confidence_flag: lowConfidence,
        status: "new",
        workspace_id: workspaceId,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return log;
  });
