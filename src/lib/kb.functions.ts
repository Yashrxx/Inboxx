/**
 * Server functions for managing the knowledge base.
 * All require an authenticated (admin) user.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const IngestSchema = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.string().max(100).optional(),
  text: z.string().min(1).max(2_000_000),
});

/**
 * Receive already-extracted text from the client (we parse PDFs in the
 * browser to keep the server runtime lean), chunk it, embed each chunk,
 * and insert into Supabase. If a document with the same filename already
 * exists, it is replaced.
 */
export const ingestDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => IngestSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { chunkText, embedMany } = await import("@/lib/rag.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const chunks = chunkText(data.text);
    if (chunks.length === 0) {
      throw new Error("No usable text found in the document.");
    }

    // Replace any existing doc with the same filename (unique constraint is global).
    await supabaseAdmin.from("kb_documents").delete().eq("filename", data.filename);

    const { data: doc, error: docErr } = await supabaseAdmin
      .from("kb_documents")
      .insert({
        filename: data.filename,
        mime_type: data.mime_type ?? null,
        byte_size: data.text.length,
        uploaded_by: context.userId,
        workspace_id: workspaceId,
      })
      .select()
      .single();
    if (docErr || !doc) {
      throw new Error(`Could not create document: ${docErr?.message}`);
    }

    const embeddings = await embedMany(chunks);
    const rows = chunks.map((content, i) => ({
      document_id: doc.id,
      chunk_index: i,
      content,
      // pgvector accepts JSON array via the typed client
      embedding: embeddings[i] as unknown as string,
    }));

    const { error: insErr } = await supabaseAdmin.from("kb_chunks").insert(rows);
    if (insErr) {
      // roll back the doc to avoid orphans
      await supabaseAdmin.from("kb_documents").delete().eq("id", doc.id);
      throw new Error(`Failed to insert chunks: ${insErr.message}`);
    }

    return { document_id: doc.id, chunk_count: chunks.length };
  });

export const listDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { data, error } = await supabaseAdmin
      .from("kb_documents")
      .select("id, filename, mime_type, byte_size, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    // also fetch chunk counts in one round trip
    const ids = (data ?? []).map((d) => d.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: cc } = await supabaseAdmin
        .from("kb_chunks")
        .select("document_id")
        .in("document_id", ids);
      for (const row of cc ?? []) {
        counts[row.document_id] = (counts[row.document_id] ?? 0) + 1;
      }
    }
    return (data ?? []).map((d) => ({
      ...d,
      chunk_count: counts[d.id] ?? 0,
    }));
  });

export const deleteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { error } = await supabaseAdmin
      .from("kb_documents")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
