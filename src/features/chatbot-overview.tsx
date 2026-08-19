/**
 * Chatbot module overview — public chat URL + bot configuration.
 * (Previously the body of the dashboard page; hooks/queries unchanged.)
 */
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyWorkspaceSettings, updateMyWorkspaceSettings } from "@/lib/workspace.functions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
      setTimeout(() => setSavedTick(false), 1500);
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const chatUrl = data?.workspaceId ? `${origin}/?workspace_id=${data.workspaceId}` : "";

  return (
    <div>
      <div>
        <h1 className="text-xl font-semibold text-foreground">Personalized Chatbot</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your live bot, its public URL, and how it behaves.
        </p>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Your public chat URL</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share this URL (or embed it) so the chatbot answers from your knowledge base. The{" "}
          <code>workspace_id</code> is required — without it the widget will refuse to load your
          data.
        </p>
        {isLoading ? (
          <div className="mt-3 flex items-center gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-20" />
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={chatUrl}
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm font-mono text-foreground"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!chatUrl}
              onClick={async () => {
                await navigator.clipboard.writeText(chatUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">
            Test and interact with your bot directly inside the app on the dedicated Live Bot page.
          </p>
          <Link
            to="/chatbot/live"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Converse with Live Bot →
          </Link>
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold text-foreground">Chatbot configuration</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Customize how your bot greets users and how it behaves. Changes apply to your public chat
          URL immediately after saving.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Chat Welcome Message
            </label>
            <p className="mt-1 text-xs text-muted-foreground">
              The first message the bot shows when a visitor opens the chat.
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-10 w-full" />
            ) : (
              <input
                type="text"
                value={welcome}
                onChange={(e) => setWelcome(e.target.value)}
                placeholder="Hello! How can I help you today?"
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground">System Prompt</label>
            <p className="mt-1 text-xs text-muted-foreground">
              Instructions that tell the bot how to behave (tone, persona, guardrails). Leave blank
              to use a safe default.
            </p>
            {isLoading ? (
              <Skeleton className="mt-2 h-[232px] w-full" />
            ) : (
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={10}
                placeholder="You are a helpful AI assistant. Answer only from the CONTEXT provided…"
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
              />
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => mut.mutate()} disabled={mut.isPending}>
              {mut.isPending ? "Saving…" : "Save changes"}
            </Button>
            {savedTick && <span className="text-sm text-muted-foreground">Saved ✓</span>}
            {mut.isError && (
              <span className="text-sm text-destructive">Failed to save. Try again.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
