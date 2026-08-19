/**
 * Customer-facing AI chat page. Public, no login.
 * Sends conversation history (kept in memory only) to /api/public/chat
 * and renders the streamed reply token-by-token.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";
import { HOME_HERO_IMG } from "@/lib/assets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: BRAND_NAME },
      {
        name: "description",
        content:
          "Chat with the Inboxx Assistant — instant answers, drafted replies, and lead capture for your inbox.",
      },
    ],
  }),
  component: HomeRoute,
});

type Msg = { role: "user" | "assistant"; content: string };

const DEFAULT_WELCOME = "Hello! How can I help you today?";

/**
 * `/` serves two audiences:
 *  - embeds / shared links with ?workspace_id=… → the live chat widget
 *  - everyone else → the public marketing showcase
 */
function HomeRoute() {
  const [ws, setWs] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("workspace_id") || "";
    setWs(param);
    setReady(true);
  }, []);

  return ready && ws ? <ChatPage workspaceId={ws} /> : <LandingPage />;
}

const SERVICES = [
  {
    title: "Personalized Chatbot",
    subtitle:
      "Custom knowledge-base powered chatbot widget for your website, complete with lead scoring and conversation review notes.",
  },
  {
    title: "Email Draft Generation",
    subtitle: "AI draft generation using connected Gmail accounts and custom knowledge bases.",
  },
  {
    title: "Automations & Alerts",
    subtitle:
      "Set custom email sync rules, filter incoming messages, and receive real-time Telegram notifications.",
  },
];

function LandingPage() {
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [emailInput, setEmailInput] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
  }, []);

  async function googleSignIn() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        toast.error(error.message);
        setBusy(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fafafc] text-slate-900">
      {/* Floating Light Navbar Navigation */}
      <PublicNavbar
        currentPage="home"
        signedIn={signedIn}
        onPrimaryCta={googleSignIn}
        primaryCtaText="Try It Free"
        busy={busy}
      />

      {/* Main Hero Section with Workspace Background */}
      <main className="relative flex-1 overflow-hidden py-16 sm:py-24 lg:py-32 px-6 sm:px-12 border-b border-slate-200/60 bg-[#fafafc]">
        {/* Explicit Hero Image Layer with Direct Base64 Image */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={HOME_HERO_IMG}
            alt="AI Assistant Modern Workspace"
            className="h-full w-full object-cover object-right opacity-80 sm:opacity-90 lg:opacity-100"
            referrerPolicy="no-referrer"
          />
          {/* Fading overlay to protect text contrast on the left without hiding the right-side image */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#fafafc] via-[#fafafc]/90 to-transparent sm:max-w-2xl lg:max-w-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-6xl">
          <div className="max-w-xl text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Instantly Engage Customers with Smart AI Chatbots
            </h1>

            <p className="mt-4 text-sm sm:text-base text-slate-600 font-normal leading-relaxed max-w-lg">
              Automate conversations, boost sales, and provide 24/7 support—all with one intelligent
              chatbot platform.
            </p>

            <div className="mt-7">
              <button
                onClick={googleSignIn}
                disabled={busy}
                className="rounded-full bg-[#f0533c] px-7 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#d9442e] disabled:opacity-50"
              >
                {busy ? "Opening…" : "Get Your AI Agent"}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 2. Features Showcase Grid (Built for speed, accuracy, and conversion) */}
      <section id="features" className="bg-white py-16 sm:py-24 border-b border-slate-200/80">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Built for speed, accuracy, and conversion
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Everything you need to automate your support, qualify inbound leads, and generate
              intelligent email responses.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {SERVICES.map((s) => (
              <div
                key={s.title}
                className="flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/50 p-8 shadow-xs transition hover:bg-white hover:shadow-md hover:border-slate-300"
              >
                <h3 className="text-lg font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{s.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Conversational AI Solutions Banner (Moved to the bottom) */}
      <section className="relative overflow-hidden bg-[#0b132b] text-white py-16 sm:py-24 px-6 border-t border-slate-800">
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-10 h-64 w-64 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl leading-tight">
            Conversational AI Solutions <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-[#f0533c] to-amber-300">
              Infinite Possibilities
            </span>
          </h2>

          <p className="mt-5 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Automate your Webchat, Gmail Inquiries, and Support Tickets for more leads, faster
            response times, and an exceptional customer experience.
          </p>

          {/* Email Signup Bar */}
          <div className="mt-8 max-w-md mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (emailInput) {
                  window.location.href = `/signup?email=${encodeURIComponent(emailInput)}`;
                } else {
                  googleSignIn();
                }
              }}
              className="flex items-center rounded-full border border-slate-700 bg-slate-900/90 p-1.5 shadow-lg focus-within:border-[#f0533c] focus-within:ring-2 focus-within:ring-[#f0533c]/30 transition backdrop-blur-md"
            >
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter your business email"
                className="w-full bg-transparent px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-400 outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="shrink-0 rounded-full bg-[#f0533c] px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#d9442e] disabled:opacity-50"
              >
                {busy ? "Opening…" : "Signup Free"}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#f0533c]" /> Free 14-day trial
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-[#f0533c]" /> No credit card required
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer Strip (Copyright & Policy Links) */}
      <PublicFooter showCtaBanner={false} />
    </div>
  );
}

function ChatPage({ workspaceId: initialWorkspaceId }: { workspaceId: string }) {
  const [workspaceId, setWorkspaceId] = useState<string>(initialWorkspaceId);

  const welcomeRef = useRef<Msg>({
    role: "assistant",
    content: DEFAULT_WELCOME,
  });
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(`chat_messages_${workspaceId}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [welcomeRef.current];
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [session, setSession] = useState<{ email?: string; full_name?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stable per-browser-tab session id — groups all turns of this conversation
  // under one lead row server-side.
  const getInitialSessionId = () => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("chat_session_id");
      if (saved) return saved;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem("chat_session_id", id);
      return id;
    }
    return "session-id";
  };
  const sessionIdRef = useRef<string>(getInitialSessionId());

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(`chat_messages_${workspaceId}`, JSON.stringify(messages));
    }
  }, [messages, workspaceId]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        setSession({
          email: data.session.user.email,
          full_name: data.session.user.user_metadata?.full_name,
        });

        // Auto-connect workspace if testing locally without explicit ?workspace_id
        if (!workspaceId) {
          // Fetch the *user's* workspace
          const { data: ws } = await supabase
            .from("workspaces")
            .select("id")
            .eq("user_id", data.session.user.id)
            .limit(1)
            .maybeSingle();
          if (ws) {
            window.location.replace(`/?workspace_id=${ws.id}`);
          }
        }
      }
    });
  }, [workspaceId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setShowDropdown(false);
  };

  // Fetch per-workspace welcome message and swap the first bubble in.
  // If workspaceId is empty, the API will fall back to the first DB workspace.
  useEffect(() => {
    let cancelled = false;
    const wsParam = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
    fetch(`/api/public/workspace${wsParam}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (cancelled || !j?.welcomeMessage) return;
        const next: Msg = { role: "assistant", content: j.welcomeMessage };
        setMessages((prev) => {
          if (prev[0] !== welcomeRef.current) return prev;
          welcomeRef.current = next;
          return [next, ...prev.slice(1)];
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Strip the welcome from outgoing history — it isn't real context.
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          workspaceId,
          messages: next.filter((m) => m !== welcomeRef.current),
        }),
      });

      if (!res.ok || !res.body) {
        let msg = "Sorry — something went wrong. Please try again.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {
          /* ignore */
        }
        setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
        return;
      }

      // Add an empty assistant message and stream into it.
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") continue;
          try {
            const p = JSON.parse(j);
            const c = p.choices?.[0]?.delta?.content;
            if (typeof c === "string") {
              acc += c;
              setMessages((prev) => {
                const out = prev.slice();
                out[out.length - 1] = { role: "assistant", content: acc };
                return out;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Network error contacting the assistant. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-steel text-steel-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:py-5">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold sm:text-lg">{BRAND_NAME}</h1>
            <p className="truncate text-xs text-steel-foreground/70 sm:text-sm">{BRAND_TAGLINE}</p>
          </div>
          {session ? (
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-steel-foreground/90 hover:text-steel-foreground sm:text-sm bg-steel-foreground/10 hover:bg-steel-foreground/20"
              >
                Dashboard
              </Link>
              <div className="relative group">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="rounded-md px-2 py-1 text-xs text-steel-foreground/70 hover:text-steel-foreground sm:text-sm"
                >
                  {session.full_name || session.email}
                </button>
                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-32 rounded-md border border-border bg-card shadow-lg z-50">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-secondary rounded-md text-foreground"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-md px-2 py-1 text-xs text-steel-foreground/70 hover:text-steel-foreground sm:text-sm"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <section className="bg-secondary/60 border-b border-border">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:py-5 text-center">
          <p className="text-sm sm:text-base text-foreground/80 leading-relaxed max-w-2xl mx-auto">
            Inboxx Assistant connects with your Gmail to help you view incoming messages, summarize
            email threads, and draft quick replies automatically.
          </p>
        </div>
      </section>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-3 sm:p-5"
          style={{ maxHeight: "calc(100vh - 280px)", minHeight: 360 }}
        >
          <div className="flex flex-col gap-4">
            {!workspaceId && !session ? (
              <Bubble
                role="assistant"
                content="I would be happy to help you, but please first sign in to connect your knowledge base for testing."
              />
            ) : (
              messages.map((m, i) => <Bubble key={i} role={m.role} content={m.content} />)
            )}
            {busy && messages[messages.length - 1]?.role === "user" && (
              <Bubble role="assistant" content="" typing />
            )}
          </div>
        </div>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a machine, capacity, or process…"
            className="flex-1 rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
            disabled={busy || (!workspaceId && !session)}
          />
          <button
            type="submit"
            disabled={busy || !input.trim() || (!workspaceId && !session)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </main>

      <footer className="border-t border-border bg-secondary">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-3 text-xs text-muted-foreground sm:flex-row sm:text-sm">
          <span>For pricing and quotations, our team will be in touch.</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground hover:underline">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-foreground hover:underline">
              Terms of Service
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Bubble({
  role,
  content,
  typing,
}: {
  role: "user" | "assistant";
  content: string;
  typing?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      {!isUser && (
        <span className="mb-1 ml-1 text-xs font-semibold text-muted-foreground">
          Inboxx Assistant
        </span>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[75%] ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-secondary text-secondary-foreground rounded-bl-sm"
        }`}
      >
        {typing ? (
          <span className="inline-flex gap-1">
            <Dot /> <Dot delay={150} /> <Dot delay={300} />
          </span>
        ) : isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
