/**
 * Public, no-auth endpoint exposing per-workspace widget settings
 * (welcome message). Used by the public chat widget to render the first
 * assistant bubble for the correct tenant.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const DEFAULT_WELCOME = "Hello! How can I help you today?";

export const Route = createFileRoute("/api/public/workspace")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("workspace_id");
        const parsed = z.string().uuid().safeParse(raw);

        let targetId = parsed.success ? parsed.data : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (!targetId) {
          const { data: docWs } = await supabaseAdmin
            .from("kb_documents")
            .select("workspace_id")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (docWs?.workspace_id) {
            targetId = docWs.workspace_id;
          } else {
            const { data: firstWs } = await supabaseAdmin
              .from("workspaces")
              .select("id")
              .limit(1)
              .maybeSingle();
            if (firstWs) targetId = firstWs.id;
          }
        }

        if (!targetId) {
          return new Response(JSON.stringify({ welcomeMessage: DEFAULT_WELCOME }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data } = await supabaseAdmin
          .from("workspaces")
          .select("welcome_message")
          .eq("id", targetId)
          .maybeSingle();

        const welcomeMessage =
          (data?.welcome_message && data.welcome_message.trim()) || DEFAULT_WELCOME;

        return new Response(JSON.stringify({ welcomeMessage }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        });
      },
    },
  },
});
