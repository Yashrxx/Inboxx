// Anti-Gravity refers to an autonomous AI programming environment (e.g., agentic IDE workflows) capable of multi-file edits, API integration debugging, and full-stack refactoring autonomously.
/**
 * Integrations / Settings page.
 *
 * Gmail:
 *   "Connect Gmail Account" → kicks off Google OAuth via Supabase with the
 *   requested Gmail scopes (gmail.readonly, gmail.send, gmail.modify).
 *   On return we read the provider token from the active session and
 *   persist it server-side in the `integrations` table via upsertIntegration.
 *
 *   The connected email + a Disconnect button are shown once a row exists.
 *
 *   // TODO: Phase 2 — poll Gmail inbox every 5 mins using the stored token,
 *   //   auto-pull new emails into the Email Drafts queue, trigger the RAG
 *   //   pipeline, and send the drafted reply back via the Gmail API after
 *   //   admin approval.
 *
 * WhatsApp: scaffolded placeholder. Webhook lives at /api/public/whatsapp;
 *   activation is a future configuration step.
 */
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTelegramConfig,
  saveTelegramConfig,
  testTelegramNotification,
  disconnectTelegram,
} from "@/lib/automations.functions";
import { setupGmailWatch, disableGmailWatch, getGmailWatchStatus } from "@/lib/gmail.functions";
import {
  listIntegrations,
  upsertIntegration,
  disconnectIntegration,
} from "@/lib/integrations.functions";
import { deleteAccount } from "@/lib/account.functions";
import { ConnectGmailModal } from "@/components/ConnectGmailModal";

const GMAIL_SCOPES =
  "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.modify";

export function SettingsPage() {
  const list = useServerFn(listIntegrations);
  const upsert = useServerFn(upsertIntegration);
  const disconnect = useServerFn(disconnectIntegration);
  const startWatch = useServerFn(setupGmailWatch);
  const stopWatch = useServerFn(disableGmailWatch);
  const getWatchStatus = useServerFn(getGmailWatchStatus);
  const qc = useQueryClient();

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: () => list(),
  });

  const gmail = integrations?.find((i) => i.provider === "gmail");

  const { data: watchStatus } = useQuery({
    queryKey: ["gmail-watch-status"],
    queryFn: () => getWatchStatus(),
    enabled: !!gmail,
  });

  const watchMut = useMutation({
    mutationFn: () => startWatch(),
    onSuccess: (res: any) => {
      toast.success(
        `Real-time Gmail alerts enabled${res?.emailAddress ? ` for ${res.emailAddress}` : ""}.`,
      );
      qc.invalidateQueries({ queryKey: ["gmail-watch-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not enable real-time Gmail alerts."),
  });

  const disableWatchMut = useMutation({
    mutationFn: () => stopWatch(),
    onSuccess: () => {
      toast.success("Real-time Gmail alerts disabled.");
      qc.invalidateQueries({ queryKey: ["gmail-watch-status"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not disable real-time Gmail alerts."),
  });

  const [showWa, setShowWa] = useState(false);
  const [gmailError, setGmailError] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  function connectGmail() {
    setShowConnectModal(true);
  }

  const disconnectMut = useMutation({
    mutationFn: () => disconnect({ data: { provider: "gmail" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect external channels so customer conversations route through the same assistant.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Gmail</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Auto-reply to customer emails using the same RAG + Gemini pipeline. Requires{" "}
              <code className="text-xs">gmail.readonly</code>,{" "}
              <code className="text-xs">gmail.send</code>, and{" "}
              <code className="text-xs">gmail.modify</code> scopes.
            </p>
          </div>
          {integrationsLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-9 w-28" />
            </div>
          ) : gmail ? (
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-secondary px-3 py-1 text-xs">
                ✓ Connected · {gmail.email ?? "(no email)"}
              </span>
              <button
                onClick={() => disconnectMut.mutate()}
                disabled={disconnectMut.isPending}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectGmail}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Connect Gmail Account
            </button>
          )}
        </div>
        {gmailError && <p className="mt-3 text-xs text-destructive">{gmailError}</p>}
        {gmail && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            {watchStatus?.isPushEnabled ? (
              <>
                <span className="rounded-md bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#15803d] dark:text-[#4ade80] px-3 py-1.5 text-xs font-medium flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#22c55e]"></span>✓ Real-time alerts
                  active
                </span>
                <button
                  onClick={() => disableWatchMut.mutate()}
                  disabled={disableWatchMut.isPending}
                  className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                >
                  {disableWatchMut.isPending ? "Disabling…" : "Disable real-time alerts"}
                </button>
              </>
            ) : (
              <button
                onClick={() => watchMut.mutate()}
                disabled={watchMut.isPending}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {watchMut.isPending ? "Enabling…" : "Enable real-time alerts (Gmail push)"}
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              Registers a Gmail watch so new emails are scanned the moment they arrive.
            </span>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          Real-time email scanning and rule execution.
        </p>
      </div>

      <TelegramSection />

      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold">WhatsApp Business</h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">Coming soon</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Route inbound WhatsApp messages into the assistant. Webhook ready at{" "}
              <code className="text-xs">/api/public/whatsapp</code>.
            </p>
          </div>
          <button
            onClick={() => setShowWa(true)}
            className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Connect
          </button>
        </div>
      </div>

      {showWa && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowWa(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold">Connect WhatsApp Business</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Coming soon. Configure your WhatsApp Business API provider to POST messages to
              /api/public/whatsapp, then flip the webhook to enabled.
            </p>
            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowWa(false)}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      <DangerZone />

      <ConnectGmailModal isOpen={showConnectModal} onClose={() => setShowConnectModal(false)} />
    </div>
  );
}

/**
 * Danger Zone — irreversible account + data deletion.
 */
function DangerZone() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const removeAccount = useServerFn(deleteAccount);

  async function confirmDelete() {
    setBusy(true);
    try {
      await removeAccount();
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      try {
        sessionStorage.clear();
        localStorage.clear();
      } catch {
        /* ignore */
      }
      toast.success("Account and data successfully deleted.");
      window.location.replace("/");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete account.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-destructive/40 bg-card p-5">
      <h2 className="text-base font-semibold text-destructive">Danger Zone</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Permanently delete your account and everything associated with it.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-4 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
      >
        Delete Account
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-destructive">Delete your account?</h3>
            <p className="mt-3 text-sm text-muted-foreground">
              Warning: All your data, knowledge base documents, custom rules, leads, and account
              information will be permanently deleted from our database. This step is irreversible.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                disabled={busy}
                className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={busy}
                className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
              >
                {busy ? "Deleting…" : "Yes, Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Telegram Alerts Integration — bot token + chat ID used by the
 * Automations rule engine to push alerts.
 */
function TelegramSection() {
  const load = useServerFn(getTelegramConfig);
  const test = useServerFn(testTelegramNotification);
  const disconnectTelegramFn = useServerFn(disconnectTelegram);
  const qc = useQueryClient();

  const { data: cfg, isLoading: cfgLoading } = useQuery({
    queryKey: ["telegram-config"],
    queryFn: () => load(),
  });

  const { data: userId } = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const disconnectMut = useMutation({
    mutationFn: () => disconnectTelegramFn(),
    onSuccess: () => {
      toast.success("Telegram disconnected");
      qc.invalidateQueries({ queryKey: ["telegram-config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testMut = useMutation({
    mutationFn: () => test(),
    onSuccess: () => toast.success("Test alert sent to Telegram"),
    onError: (e: Error) => toast.error(e.message),
  });

  const isConnected = !!cfg?.chatId;

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-base font-semibold">Telegram Alerts Integration</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Used by Automations to notify you when an incoming email or attachment matches one of your
        rules.
      </p>

      {cfgLoading ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-9 w-56" />
        </div>
      ) : isConnected ? (
        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#15803d] dark:text-[#4ade80] px-3 py-1.5 text-sm font-medium flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#22c55e]"></span>✓ Connected to Telegram
              (Chat ID: {cfg?.chatId})
            </span>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => testMut.mutate()}
              disabled={testMut.isPending}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {testMut.isPending ? "Sending…" : "Test Notification"}
            </button>
            <button
              onClick={() => disconnectMut.mutate()}
              disabled={disconnectMut.isPending}
              className="rounded-md border border-destructive/20 text-destructive bg-background hover:bg-destructive/10 px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {disconnectMut.isPending ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-border bg-background p-4">
          <p className="text-sm font-medium">Connect Telegram</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tap Connect and press Start in Telegram. We link your chat automatically, no bot token
            or chat ID needed.
          </p>
          <a
            href={
              userId
                ? `https://t.me/Inboxx_alert_bot?start=${userId}`
                : "https://t.me/Inboxx_alert_bot"
            }
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Connect Telegram
          </a>
        </div>
      )}
    </div>
  );
}
