/**
 * Chatbot module overview — public chat URL + bot configuration.
 * (Previously the body of the dashboard page; hooks/queries unchanged.)
 */
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyWorkspaceSettings, updateMyWorkspaceSettings } from "@/lib/workspace.functions";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Check, Copy, Pencil } from "lucide-react";

export function ChatbotOverview() {
  const fetchSettings = useServerFn(getMyWorkspaceSettings);
  const saveSettings = useServerFn(updateMyWorkspaceSettings);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["my-workspace-settings"],
    queryFn: () => fetchSettings(),
  });

  const [copied, setCopied] = useState(false);
  const [welcome, setWelcome] = useState("");
  const [prompt, setPrompt] = useState("");
  const [savedTick, setSavedTick] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (data) {
      setWelcome(data.welcomeMessage ?? "");
      setPrompt(data.systemPrompt ?? "");
    }
  }, [data]);

  const originalWelcome = data?.welcomeMessage ?? "";
  const originalPrompt = data?.systemPrompt ?? "";
  const hasChanges = welcome !== originalWelcome || prompt !== originalPrompt;

  const mut = useMutation({
    mutationFn: () => saveSettings({ data: { welcomeMessage: welcome, systemPrompt: prompt } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace-settings"] });
      setSavedTick(true);
      setIsEditing(false);
      setTimeout(() => setSavedTick(false), 2000);
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const chatUrl = data?.workspaceId ? `${origin}/?workspace_id=${data.workspaceId}` : "";

  return (
    <div className="space-y-4">
      {/* Page Title & Subtitle */}
      <div className="pb-2 border-b border-border flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Personalized Chatbot</h1>
          <p className="text-xs text-muted-foreground leading-none mt-0.5">
            Your live bot, its public URL, and how it behaves.
          </p>
        </div>
        <Link
          to="/chatbot/live"
          className="inline-flex items-center justify-center gap-1.5 rounded bg-[#f0533c] hover:bg-[#d83f29] text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition-all shrink-0"
        >
          <span>Converse with Live Bot</span>
          <span>→</span>
        </Link>
      </div>

      {/* Card 1: Public Chat URL */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Your public chat URL</h2>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Share this URL (or embed it) so the chatbot answers from your knowledge base. The{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[10px] text-[#b91c1c]">
              workspace_id
            </code>{" "}
            is required.
          </p>
        </div>

        {isLoading ? (
          <Skeleton className="h-9 w-full rounded-md" />
        ) : (
          <div className="rounded-md border border-border bg-secondary/30 p-0.5 flex items-center justify-between gap-2 pl-3 pr-1 min-w-0">
            <span className="text-xs font-mono text-slate-800 select-all truncate">{chatUrl}</span>
            <button
              type="button"
              disabled={!chatUrl}
              onClick={async () => {
                await navigator.clipboard.writeText(chatUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-secondary transition-all"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-muted-foreground" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Card 2: Configuration */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        {/* Card Header with Edit button on the right */}
        <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Chatbot configuration</h2>
            <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
              Customize how your bot greets users and how it behaves. Changes apply immediately.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {savedTick && (
              <span className="text-xs font-semibold text-emerald-600 animate-fade-in mr-2">
                Saved successfully ✓
              </span>
            )}
            {mut.isError && (
              <span className="text-xs font-semibold text-red-600 mr-2">Failed to save.</span>
            )}

            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded bg-[#f0533c] hover:bg-[#d83f29] text-white px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={mut.isPending || !hasChanges}
                  onClick={() => mut.mutate()}
                  className={`inline-flex items-center justify-center gap-1.5 rounded px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-all ${
                    hasChanges
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {mut.isPending ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3" />
                      <span>Save changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={mut.isPending}
                  onClick={() => {
                    setWelcome(originalWelcome);
                    setPrompt(originalPrompt);
                    setIsEditing(false);
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded border border-border bg-background hover:bg-secondary px-3 py-1.5 text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {/* Welcome Message */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-800">
              Chat Welcome Message
            </label>
            {isLoading ? (
              <Skeleton className="h-9 w-full rounded-md" />
            ) : (
              <input
                type="text"
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                disabled={!isEditing}
                placeholder="Hello! How can I help you today?"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all disabled:opacity-75 disabled:bg-slate-50/50"
              />
            )}
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              The first message the bot shows when a visitor opens the chat.
            </p>
          </div>

          {/* System Prompt */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-800">System Prompt</label>
            {isLoading ? (
              <Skeleton className="h-[100px] w-full rounded-md" />
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={!isEditing}
                rows={4}
                placeholder="You are a helpful AI assistant. Answer only from the CONTEXT provided…"
                className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all leading-relaxed disabled:opacity-75 disabled:bg-slate-50/50"
              />
            )}
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              Instructions that tell the bot how to behave (tone, persona, guardrails).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
