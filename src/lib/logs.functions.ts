/**
 * Server functions for listing and updating answer_logs.
 * Used by Email Drafts and Review pages.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ListSchema = z.object({
  type: z.enum(["chat", "email_draft"]).optional(),
  limit: z.number().min(1).max(500).default(100),
});

export const listLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ListSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    let q = supabaseAdmin
      .from("answer_logs")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.type) q = q.eq("type", data.type);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const UpdateSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(-1).max(1).nullable().optional(),
  correction: z.string().max(10_000).nullable().optional(),
  status: z.enum(["new", "good", "needs_fix", "sent", "archived"]).optional(),
  answer_text: z.string().max(50_000).optional(),
});

export const updateLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const patch: {
      rating?: number | null;
      correction?: string | null;
      status?: "new" | "good" | "needs_fix" | "sent" | "archived";
      answer_text?: string;
    } = {};
    if (data.rating !== undefined) patch.rating = data.rating;
    if (data.correction !== undefined) patch.correction = data.correction;
    if (data.status !== undefined) patch.status = data.status;
    if (data.answer_text !== undefined) patch.answer_text = data.answer_text;

    const { error } = await supabaseAdmin
      .from("answer_logs")
      .update(patch)
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);

    // Auto-Correction Feature: Embed the correction back into the KB.
    if (patch.correction) {
      try {
        const { data: logData } = await supabaseAdmin
          .from("answer_logs")
          .select("incoming_text, type")
          .eq("id", data.id)
          .single();

        if (logData && logData.incoming_text) {
          const formattedCorrection = `[Admin Correction for a previous ${logData.type} answer]\nQuestion: ${logData.incoming_text}\nCorrected Answer / Information: ${patch.correction}`;
          const virtualFilename = `admin_correction_${data.id}.txt`;

          const { chunkText, embedMany } = await import("@/lib/rag.server");
          const chunks = chunkText(formattedCorrection);

          if (chunks.length > 0) {
            // Delete any existing doc for this log to handle re-edits cleanly
            await supabaseAdmin.from("kb_documents").delete().eq("filename", virtualFilename);

            const { data: doc, error: docErr } = await supabaseAdmin
              .from("kb_documents")
              .insert({
                filename: virtualFilename,
                mime_type: "text/plain",
                byte_size: formattedCorrection.length,
                uploaded_by: context.userId,
                workspace_id: workspaceId,
              })
              .select()
              .single();

            if (doc && !docErr) {
              const embeddings = await embedMany(chunks);
              const rows = chunks.map((content, i) => ({
                document_id: doc.id,
                chunk_index: i,
                content,
                embedding: embeddings[i] as unknown as string,
              }));

              await supabaseAdmin.from("kb_chunks").insert(rows);
            }
          }
        }
      } catch (err) {
        console.error("Failed to auto-embed correction:", err);
      }
    }

    return { ok: true };
  });

export const getQualityStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { data, error } = await supabaseAdmin
      .from("answer_logs")
      .select("status")
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    const stats = { good: 0, needs_fix: 0, total: data?.length ?? 0 };
    for (const row of data ?? []) {
      if (row.status === "good") stats.good++;
      else if (row.status === "needs_fix") stats.needs_fix++;
    }
    return stats;
  });

const DeleteLogSchema = z.object({ id: z.string().uuid() });

export const deleteLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => DeleteLogSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);
    const { error } = await supabaseAdmin
      .from("answer_logs")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
