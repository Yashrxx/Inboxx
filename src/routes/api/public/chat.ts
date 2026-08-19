/**
 * Public, no-auth streaming chat endpoint for the customer-facing widget.
 *
 * Flow per request:
 *   1. Take {messages: [{role, content}, ...]} from client (in-memory history).
 *   2. Embed the latest user turn, vector-search top 5 KB chunks.
 *   3. Stream Gemini's reply via SSE; the client renders tokens as they
 *      arrive.
 *   4. Once the stream finishes, log the full answer + sources to
 *      answer_logs (type='chat', auto-flag low confidence).
 *
 * No auth on this endpoint — it's the public widget. All keys stay
 * server-side.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({
  sessionId: z.string().min(1).max(200),
  // Optional: when the embedded widget is loaded without ?workspace_id=, we
  // fall back to the first workspace in the database (single-tenant default).
  // Accept "" / null / missing — all mean "use default".
  // Accept missing, null, empty string, or a valid uuid. Anything else
  // becomes undefined (treated as "use default workspace").
  workspaceId: z
    .any()
    .optional()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const parsed = z.string().uuid().safeParse(v);
      return parsed.success ? parsed.data : undefined;
    }),

  // Optional integration/source label — lets the dashboard partition traffic
  // originating from external embeds (e.g. "portfolio", "resume-site").
  // null/empty/undefined ⇒ native app traffic.
  source: z
    .any()
    .optional()
    .transform((v) => {
      if (v == null || v === "") return undefined;
      const s = String(v).slice(0, 100).trim();
      return s || undefined;
    }),

  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(20_000),
      }),
    )
    .min(1)
    .max(50),
});

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const { corsHeadersFor } = await import("@/lib/security.server");
        return new Response(null, {
          status: 204,
          headers: corsHeadersFor(request),
        });
      },
      POST: async ({ request }) => {
        try {
          const { corsHeadersFor } = await import("@/lib/security.server");
          const corsHeaders = corsHeadersFor(request);
          const { searchKb, buildContextBlock, CHAT_MODEL } = await import("@/lib/rag.server");
          const { LOW_CONFIDENCE_PHRASES } = await import("@/lib/system-prompt");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          let parsed: z.infer<typeof BodySchema>;
          try {
            parsed = BodySchema.parse(await request.json());
          } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid request body" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          const lastUser = [...parsed.messages].reverse().find((m) => m.role === "user");
          if (!lastUser) {
            return new Response(JSON.stringify({ error: "No user message" }), {
              status: 400,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }

          // Fallback to active workspace with documents if none is provided.
          let workspaceId = parsed.workspaceId ?? null;
          if (!workspaceId) {
            const { data: docWs } = await supabaseAdmin
              .from("kb_documents")
              .select("workspace_id")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (docWs?.workspace_id) {
              workspaceId = docWs.workspace_id;
            } else {
              const { data: firstWs } = await supabaseAdmin
                .from("workspaces")
                .select("id")
                .limit(1)
                .maybeSingle();
              if (firstWs) workspaceId = firstWs.id;
            }
          }

          // Capture calling domain from Origin/Referer so external embeds can be
          // partitioned from native app traffic in the dashboard.
          function extractDomain(v: string | null): string | null {
            if (!v) return null;
            try {
              const h = new URL(v).hostname.toLowerCase();
              return h || null;
            } catch {
              return null;
            }
          }
          const nativeHosts = new Set(["localhost", "127.0.0.1"]);
          const rawDomain =
            extractDomain(request.headers.get("origin")) ??
            extractDomain(request.headers.get("referer"));
          const sourceDomain = rawDomain && !nativeHosts.has(rawDomain) ? rawDomain : null;

          if (!workspaceId) {
            return new Response(
              JSON.stringify({
                error: "No workspace found. Please contact support.",
              }),
              { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
            );
          }

          // Per-workspace system prompt (falls back to a standard default).
          const DEFAULT_SYSTEM_PROMPT =
            "You are a helpful and accurate AI assistant. Answer questions using the provided CONTEXT from the knowledge base. If the context does not contain the answer, politely say you do not have that information in your knowledge base.";
          const { data: wsRow } = await supabaseAdmin
            .from("workspaces")
            .select("system_prompt")
            .eq("id", workspaceId)
            .maybeSingle();

          const systemPrompt =
            (wsRow?.system_prompt && wsRow.system_prompt.trim()) || DEFAULT_SYSTEM_PROMPT;

          let matches: any[] = [];
          try {
            matches = await searchKb(lastUser.content, workspaceId, 5);
          } catch (kbErr) {
            console.error("[Chat API] KB search error:", kbErr);
          }
          const topSim = matches[0]?.similarity ?? 0;
          const contextBlock = buildContextBlock(matches);

          const { generateContentStreamWithFallback } = await import("@/lib/rag.server");

          const contents = parsed.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          }));

          let fullAnswer = "";

          const stream = new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder();
              try {
                const { stream: responseStream } = await generateContentStreamWithFallback({
                  contents,
                  config: {
                    systemInstruction: `${systemPrompt}\n\n${contextBlock}`,
                  },
                });

                for await (const chunk of responseStream) {
                  const text = chunk.text;
                  if (text) {
                    fullAnswer += text;
                    const sse = `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`;
                    controller.enqueue(encoder.encode(sse));
                  }
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              } catch (e: any) {
                console.error("chat stream error", e);
                const isRateLimit =
                  e?.status === 429 ||
                  e?.statusCode === 429 ||
                  String(e?.message || e).includes("429") ||
                  String(e?.message || e).includes("RESOURCE_EXHAUSTED");
                const errText = isRateLimit
                  ? "\n\n[Too many requests — please try again in a moment.]"
                  : "\n\n[An error occurred while generating the response.]";
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ choices: [{ delta: { content: errText } }] })}\n\n`,
                  ),
                );
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              } finally {
                try {
                  const lowConfidence =
                    topSim < 0.5 ||
                    LOW_CONFIDENCE_PHRASES.some((p) =>
                      fullAnswer.toLowerCase().includes(p.toLowerCase()),
                    );
                  await supabaseAdmin.from("answer_logs").insert({
                    type: "chat",
                    session_id: parsed.sessionId,
                    incoming_text: lastUser.content,
                    answer_text: fullAnswer,
                    sources_used: matches.map((m) => ({
                      filename: m.filename,
                      similarity: m.similarity,
                    })),
                    confidence_flag: lowConfidence,
                    status: "new",
                    workspace_id: workspaceId,
                    source: parsed.source ?? null,
                    source_domain: sourceDomain,
                  });

                  // Lead capture + scoring (best-effort, never breaks chat).
                  const { captureChatLead } = await import("@/lib/leads.server");
                  await captureChatLead({
                    sessionId: parsed.sessionId,
                    workspaceId: workspaceId,
                    messages: [...parsed.messages, { role: "assistant", content: fullAnswer }],
                    lastUserText: lastUser.content,
                    lowConfidence,
                    source: parsed.source ?? null,
                    sourceDomain,
                  });
                } catch (logErr) {
                  console.error("failed to log chat answer", logErr);
                } finally {
                  // Always close the stream, even if logging fails.
                  controller.close();
                }
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              ...corsHeaders,
            },
          });
        } catch (unhandledErr: any) {
          console.error("[Chat API Handler Error]:", unhandledErr);
          return new Response(
            JSON.stringify({ error: unhandledErr?.message || "Internal server error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      },
    },
  },
});
