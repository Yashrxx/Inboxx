import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getUserWorkspaceId(userId: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("workspaces")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    return data.id;
  }

  // If no workspace exists yet (e.g. new signup / OAuth login before trigger or trigger failed),
  // ensure profile exists and create a default workspace.
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      await supabaseAdmin.from("profiles").upsert(
        {
          id: userId,
          full_name: "Admin User",
        },
        { onConflict: "id" },
      );
    }

    const { data: newWs, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .insert({
        user_id: userId,
        name: "Default Workspace",
        welcome_message: "Hello! How can I help you today?",
        system_prompt:
          "You are a helpful AI assistant. Answer accurately based on the provided context.",
      })
      .select("id")
      .single();

    if (!wsErr && newWs?.id) {
      return newWs.id;
    }
  } catch (creationErr) {
    console.error("[Workspace Server] Failed to auto-create workspace:", creationErr);
  }

  if (error) {
    throw new Error(`Could not find workspace for user: ${error.message}`);
  }

  throw new Error("No workspace found for this account. Please refresh or create one.");
}
