import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { upsertIntegration, getGoogleClientId } from "@/lib/integrations.functions";
import { Mail, ShieldCheck, X, Key, Info } from "lucide-react";

declare global {
  interface Window {
    google?: any;
  }
}

interface ConnectGmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function ensureGsiLoaded(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.google?.accounts?.oauth2) {
      resolve(true);
      return;
    }
    let script = document.getElementById("google-gsi-client") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    let checks = 0;
    const checkInterval = setInterval(() => {
      checks++;
      if (window.google?.accounts?.oauth2) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (checks > 30) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
}

export function ConnectGmailModal({ isOpen, onClose, onSuccess }: ConnectGmailModalProps) {
  const upsert = useServerFn(upsertIntegration);
  const fetchClientId = useServerFn(getGoogleClientId);
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [clientId, setClientId] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      ensureGsiLoaded().catch(() => {});
      supabase.auth.getUser().then(({ data }) => {
        if (data.user?.email && !email) {
          setEmail(data.user.email);
        }
      });
      fetchClientId()
        .then((res) => {
          if (res?.clientId) setClientId(res.clientId);
        })
        .catch(() => {});
    }
  }, [isOpen, email, fetchClientId]);

  // Listen for OAuth hash return (#access_token=ya29...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#", "?"));
      const token = params.get("access_token");
      if (token) {
        (async () => {
          try {
            let fetchedEmail = email;
            try {
              const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const info = await res.json();
                if (info.email) fetchedEmail = info.email;
              }
            } catch (e) {
              console.warn("Userinfo error:", e);
            }

            await upsert({
              data: {
                provider: "gmail",
                email: fetchedEmail || "gmail-user@gmail.com",
                access_token: token,
              },
            });

            toast.success(
              `Gmail account (${fetchedEmail || "connected"}) successfully authorized!`,
            );
            qc.invalidateQueries({ queryKey: ["integrations"] });
            qc.invalidateQueries({ queryKey: ["gmail-inbox"] });
            qc.invalidateQueries({ queryKey: ["gmail-watch-status"] });

            window.history.replaceState(null, "", window.location.pathname);
            if (onSuccess) onSuccess();
            onClose();
          } catch (err: any) {
            toast.error(err?.message || "Failed to save Google connection.");
          }
        })();
      }
    }
  }, [email, upsert, qc, onSuccess, onClose]);

  if (!isOpen) return null;

  async function handleGoogleOAuthConnect() {
    const activeClientId = clientId.trim();
    if (!activeClientId) {
      toast.error(
        "Google Client ID is missing. Please enter your Client ID under Advanced Settings.",
      );
      setShowAdvanced(true);
      return;
    }

    setGoogleLoading(true);

    try {
      const isLoaded = await ensureGsiLoaded();

      if (isLoaded && window.google?.accounts?.oauth2) {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: [
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/gmail.send",
            "https://www.googleapis.com/auth/gmail.modify",
            "https://www.googleapis.com/auth/userinfo.email",
            "https://www.googleapis.com/auth/userinfo.profile",
          ].join(" "),
          callback: async (response: any) => {
            if (response.error) {
              setGoogleLoading(false);
              toast.error(
                `Google authorization failed: ${response.error_description || response.error}`,
              );
              return;
            }

            if (response.access_token) {
              try {
                let userEmail = email;
                try {
                  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
                    headers: { Authorization: `Bearer ${response.access_token}` },
                  });
                  if (userinfoRes.ok) {
                    const info = await userinfoRes.json();
                    if (info.email) userEmail = info.email;
                  }
                } catch (e) {
                  console.warn("Userinfo fetch error:", e);
                }

                await upsert({
                  data: {
                    provider: "gmail",
                    email: userEmail || "gmail-user@gmail.com",
                    access_token: response.access_token,
                  },
                });

                toast.success(`Gmail account (${userEmail}) connected via Google OAuth!`);
                qc.invalidateQueries({ queryKey: ["integrations"] });
                qc.invalidateQueries({ queryKey: ["gmail-inbox"] });
                qc.invalidateQueries({ queryKey: ["gmail-watch-status"] });

                if (onSuccess) onSuccess();
                onClose();
              } catch (err: any) {
                toast.error(err?.message || "Failed to save Gmail connection.");
              } finally {
                setGoogleLoading(false);
              }
            } else {
              setGoogleLoading(false);
            }
          },
        });

        client.requestAccessToken();
      } else {
        // Fallback: Direct Google OAuth Authorization Redirect
        const scopes = [
          "https://www.googleapis.com/auth/gmail.readonly",
          "https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/userinfo.profile",
        ].join(" ");

        const redirectUri = window.location.origin + window.location.pathname;
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          activeClientId,
        )}&redirect_uri=${encodeURIComponent(
          redirectUri,
        )}&response_type=token&scope=${encodeURIComponent(scopes)}&prompt=consent`;

        window.location.href = googleAuthUrl;
      }
    } catch (err: any) {
      setGoogleLoading(false);
      toast.error(err?.message || "Unable to launch Google authentication.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Connect Gmail Account</h2>
              <p className="text-xs text-muted-foreground">
                Official Google authorization for reading & sending emails
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Clicking below opens Google's official sign-in screen where you can review & select
              the required permissions (<code className="text-[11px]">read</code>,{" "}
              <code className="text-[11px]">modify</code>, <code className="text-[11px]">send</code>
              ).
            </p>

            <button
              type="button"
              onClick={handleGoogleOAuthConnect}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-input bg-background py-3 px-4 text-sm font-semibold text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {googleLoading ? "Connecting to Google..." : "Connect with Google Account"}
            </button>

            <div className="rounded-lg bg-secondary/60 p-3 flex items-start gap-2.5 text-xs text-muted-foreground border border-border/50">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                Your credentials remain encrypted with Google. You will be prompted to grant Gmail
                read, write, and send permissions on Google's official verification screen.
              </span>
            </div>
          </div>

          <div className="border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Key className="h-3.5 w-3.5" />
              {showAdvanced ? "Hide Advanced Settings" : "Advanced Google Client ID Configuration"}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3 animate-in fade-in duration-100">
                <div>
                  <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="136437071621-...apps.googleusercontent.com"
                    className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    Fetched automatically from server configuration.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={googleLoading}
              className="rounded-md border border-border bg-background px-4 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
