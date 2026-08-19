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
import { Loader2, Check, Copy } from "lucide-react";

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

  useEffect(() => {
    if (data) {
      setWelcome(data.welcomeMessage ?? "");
      setPrompt(data.systemPrompt ?? "");
    }
  }, [data]);

  const mut = useMutation({
    mutationFn: () => saveSettings({ data: { welcomeMessage: welcome, systemPrompt: prompt } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-workspace-settings"] });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2000);
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const chatUrl = data?.workspaceId ? `${origin}/?workspace_id=${data.workspaceId}` : "";

  return (
    <div className="space-y-4">
      {/* Page Title & Subtitle */}
      <div className="pb-2 border-b border-border">
        <h1 className="text-xl font-semibold text-slate-900">Personalized Chatbot</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Your live bot, its public URL, and how it behaves.
        </p>
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground max-w-lg leading-relaxed">
            Test and interact with your bot directly inside the app on the dedicated Live Bot page.
          </p>
          <Link
            to="/chatbot/live"
            className="inline-flex items-center justify-center gap-1 rounded bg-sky-600 hover:bg-sky-700 text-white px-3.5 py-1.5 text-xs font-medium shadow-sm transition-all shrink-0"
          >
            <span>Converse with Live Bot</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* Card 2: Configuration */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Chatbot configuration</h2>
          <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
            Customize how your bot greets users and how it behaves. Changes apply immediately.
          </p>
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
                placeholder="Hello! How can I help you today?"
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all"
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
                rows={4}
                placeholder="You are a helpful AI assistant. Answer only from the CONTEXT provided…"
                className="w-full rounded-md border border-input bg-background p-2.5 font-mono text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30 transition-all leading-relaxed"
              />
            )}
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
              Instructions that tell the bot how to behave (tone, persona, guardrails).
            </p>
          </div>

          {/* Action buttons */}
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => mut.mutate()}
              disabled={mut.isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-1.5 text-xs font-medium shadow-sm transition-all"
            >
              {mut.isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Save changes</span>
                </>
              )}
            </button>
            {savedTick && (
              <span className="text-xs font-semibold text-emerald-600 animate-fade-in">
                Saved successfully ✓
              </span>
            )}
            {mut.isError && (
              <span className="text-xs font-semibold text-red-600">
                Failed to save. Please try again.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
