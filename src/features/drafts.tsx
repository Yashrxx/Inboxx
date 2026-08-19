/**
 * Email Drafts — split-screen Gmail inbox + AI draft composer.
 *
 * LEFT: Gmail inbox fetched via the stored OAuth token (integrations table).
 *       User selects a message via checkbox.
 * RIGHT: full email body + AI-generated draft reply (RAG + Gemini).
 *        User can edit and send via Gmail API.
 *
 * Rules:
 * - Drafts are only generated when the user clicks "Generate Draft".
 * - The RAG pipeline and system prompts are unchanged — we re-use
 *   generateEmailDraft() exactly as before.
 *
 * TODO: Phase 3 — replace manual refresh with Gmail webhook push
 * notifications for real-time inbox updates.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertTriangle, Mail, RefreshCw } from "lucide-react";
import { fetchGmailInbox, sendGmailReply, type GmailMessage } from "@/lib/gmail.functions";
import { generateEmailDraft } from "@/lib/email-draft.functions";
import { listIntegrations, upsertIntegration } from "@/lib/integrations.functions";
import { supabase } from "@/integrations/supabase/client";
import { ConnectGmailModal } from "@/components/ConnectGmailModal";

export function EmailDraftsPage() {
  const fetchInbox = useServerFn(fetchGmailInbox);
  const sendReply = useServerFn(sendGmailReply);
  const genDraft = useServerFn(generateEmailDraft);
  const listInts = useServerFn(listIntegrations);
  const upsert = useServerFn(upsertIntegration);
  const qc = useQueryClient();

  const [showConnectModal, setShowConnectModal] = useState(false);

  async function handleConnectGmail() {
    setShowConnectModal(true);
  }

  // Check Gmail connection status
  const { data: integrations } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => listInts(),
  });
  const gmailConnected = !!integrations?.find((i) => i.provider === "gmail");

  // Inbox fetch (only when connected)
  const {
    data: emails,
    isLoading,
    isFetching,
    error: inboxError,
    refetch,
  } = useQuery({
    queryKey: ["gmail-inbox"],
    queryFn: () => fetchInbox(),
    enabled: gmailConnected,
    retry: false,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const selectedEmail = emails?.find((e) => e.id === selectedId) ?? null;

  function selectEmail(e: GmailMessage) {
    setSelectedId(e.id);
    setDraftText("");
    setGenError(null);
  }

  async function generate() {
    if (!selectedEmail) return;
    setGenerating(true);
    setGenError(null);
    try {
      const log = await genDraft({
        data: { incoming_email: selectedEmail.body || selectedEmail.snippet },
      });
      setDraftText(log.answer_text ?? "");
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Failed to generate draft.");
    } finally {
      setGenerating(false);
    }
  }

  const sendMut = useMutation({
    mutationFn: async () => {
      if (!selectedEmail) throw new Error("No email selected.");
      if (!draftText.trim()) throw new Error("Draft is empty.");
      return sendReply({
        data: {
          to: selectedEmail.fromEmail,
          subject: selectedEmail.subject,
          body: draftText,
          threadId: selectedEmail.threadId,
          inReplyToMessageId: selectedEmail.id,
        },
      });
    },
    onSuccess: () => {
      toast.success("Reply sent successfully.");
      setDraftText("");
      setSelectedId(null);
      qc.invalidateQueries({ queryKey: ["gmail-inbox"] });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Failed to send reply.");
    },
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Email Drafts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your Gmail inbox, generate AI replies, edit, and send.
          </p>
        </div>
      </div>

      {!gmailConnected ? (
        <div className="mx-auto my-8 max-w-md space-y-4 rounded-lg border border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Connect Your Gmail</h2>
            <p className="text-xs text-muted-foreground">
              Link your Gmail account to view your inbox, generate AI draft replies using your
              Knowledge Base context, and send responses.
            </p>
          </div>
          <button
            onClick={handleConnectGmail}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Mail className="h-4 w-4" />
            Connect Gmail
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* LEFT: Inbox */}
          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-3">
              <h2 className="text-sm font-semibold">Gmail Inbox</h2>
              <button
                onClick={() => refetch()}
                disabled={isFetching}
                className="rounded-md border border-border bg-background px-3 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                {isFetching ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <p className="p-6 text-sm text-muted-foreground">Loading inbox…</p>
              ) : inboxError ? (
                <div className="space-y-3 p-6 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-foreground">
                      Gmail Connection Notice
                    </h3>
                    <p className="mx-auto max-w-xs text-xs text-muted-foreground">
                      {inboxError instanceof Error
                        ? inboxError.message
                        : "Unable to load Gmail inbox."}
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2">
                    <button
                      onClick={handleConnectGmail}
                      className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reconnect Gmail
                    </button>
                    <button
                      onClick={() => refetch()}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : !emails || emails.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Inbox is empty.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {emails.map((e) => (
                    <li
                      key={e.id}
                      onClick={() => selectEmail(e)}
                      className={`cursor-pointer p-3 hover:bg-secondary/50 ${
                        selectedId === e.id ? "bg-secondary" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedId === e.id}
                          onChange={() => selectEmail(e)}
                          onClick={(ev) => ev.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-medium">{e.from}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {e.date ? new Date(e.date).toLocaleDateString() : ""}
                            </span>
                          </div>
                          <div className="truncate text-sm">{e.subject}</div>
                          <div className="mt-1 truncate text-xs text-muted-foreground">
                            {e.snippet}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* TODO: Phase 3 — replace manual refresh with Gmail webhook
                push notifications for real-time inbox updates. */}
          </div>

          {/* RIGHT: Draft area */}
          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border p-3">
              <h2 className="text-sm font-semibold">Draft Reply</h2>
            </div>
            {!selectedEmail ? (
              <p className="p-6 text-sm text-muted-foreground">
                Select an email from the inbox to draft a reply.
              </p>
            ) : (
              <div className="space-y-4 p-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">From</div>
                  <div className="text-sm">
                    {selectedEmail.from} &lt;{selectedEmail.fromEmail}&gt;
                  </div>
                  <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">
                    Subject
                  </div>
                  <div className="text-sm">{selectedEmail.subject}</div>
                  <div className="mt-2 text-xs font-semibold uppercase text-muted-foreground">
                    Message
                  </div>
                  <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-secondary p-3 text-xs text-secondary-foreground">
                    {selectedEmail.body || selectedEmail.snippet}
                  </pre>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase text-muted-foreground">
                      AI Draft Reply
                    </div>
                    <button
                      onClick={generate}
                      disabled={generating}
                      className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {generating ? "Generating…" : draftText ? "Regenerate" : "Generate Draft"}
                    </button>
                  </div>
                  {genError && <p className="mt-2 text-xs text-destructive">{genError}</p>}
                  <textarea
                    value={draftText}
                    onChange={(e) => setDraftText(e.target.value)}
                    rows={12}
                    placeholder="Click 'Generate Draft' to create an AI reply, or write one manually."
                    className="mt-2 w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      onClick={() => sendMut.mutate()}
                      disabled={sendMut.isPending || !draftText.trim()}
                      className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {sendMut.isPending ? "Sending…" : "Send Reply"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConnectGmailModal isOpen={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </div>
  );
}
