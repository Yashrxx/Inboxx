import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const { data } = await supabaseAdmin
      .from("kb_images")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    return data ?? [];
  });

export const removeImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string(), image_url: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    await supabaseAdmin
      .from("kb_images")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);

    try {
      const urlParts = data.image_url.split("/kb-images/");
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabaseAdmin.storage.from("kb-images").remove([storagePath]);
      }
    } catch (e) {}

    return true;
  });

export const ingestImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        filename: z.string(),
        base64: z.string(),
        name: z.string().min(1),
        tags: z.string().optional(),
        caption: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { getUserWorkspaceId } = await import("@/lib/workspace.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const workspaceId = await getUserWorkspaceId(context.userId);

    const base64Data = data.base64.split(",")[1];
    if (!base64Data) throw new Error("Invalid base64 string provided.");

    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const buffer = bytes.buffer;

    // Fallback uuid generation if crypto.randomUUID is not mapped
    const genId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);

    const storagePath = `${workspaceId}/${genId}-${data.filename}`;
    const contentType = data.filename.toLowerCase().endsWith(".svg")
      ? "image/svg+xml"
      : data.filename.toLowerCase().endsWith(".png")
        ? "image/png"
        : "image/jpeg";

    const { error: uploadError } = await supabaseAdmin.storage
      .from("kb-images")
      .upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: publicUrlData } = supabaseAdmin.storage
      .from("kb-images")
      .getPublicUrl(storagePath);

    const { data: row, error: dbError } = await supabaseAdmin
      .from("kb_images")
      .insert({
        workspace_id: workspaceId,
        image_url: publicUrlData.publicUrl,
        name: data.name,
        tags: data.tags || null,
        caption: data.caption || null,
      })
      .select()
      .single();

    if (dbError) throw new Error(`DB Insert failed: ${dbError.message}`);

    return row;
  });
