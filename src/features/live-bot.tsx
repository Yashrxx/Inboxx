import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { getMyWorkspaceSettings } from "@/lib/workspace.functions";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, Send, Trash2, Sparkles, RefreshCw, MessageSquare } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const DEFAULT_WELCOME = "Hello! How can I help you today?";

export function LiveBotPage() {
  const fetchSettings = useServerFn(getMyWorkspaceSettings);
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["my-workspace-settings"],
    queryFn: () => fetchSettings(),
  });

  const workspaceId = settings?.workspaceId ?? "";
  const welcomeMessage = settings?.welcomeMessage || DEFAULT_WELCOME;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize conversation with welcome message once settings load
  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [welcomeMessage, messages.length]);

  // Stable session ID for this live testing session
  const sessionIdRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `live-session-${Date.now()}`,
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const handleClear = () => {
    setMessages([{ role: "assistant", content: welcomeMessage }]);
    sessionIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `live-session-${Date.now()}`;
  };

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || busy || !workspaceId) return;

    if (!textToSend) setInput("");
    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setBusy(true);

    try {
      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          workspaceId,
          messages: nextMessages,
        }),
      });

      if (!res.ok || !res.body) {
        let errorMsg = "Sorry, something went wrong processing your message.";
        try {
          const json = await res.json();
          if (json?.error) errorMsg = json.error;
        } catch {
          /* ignore */
        }
        setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let accumulated = "";

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
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const contentChunk = parsed.choices?.[0]?.delta?.content;
            if (typeof contentChunk === "string") {
              accumulated += contentChunk;
              setMessages((prev) => {
                const updated = prev.slice();
                updated[updated.length - 1] = { role: "assistant", content: accumulated };
                return updated;
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
          content: "Network error communicating with the bot. Please check your connection.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  const SUGGESTIONS = [
    "What services or products do you offer?",
    "How can I contact support?",
    "Tell me about your business hours",
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Live Bot Conversation</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Mode
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Converse directly with your AI chatbot. Answers are generated in real-time from your
            system prompt and Knowledge Base.
          </p>
        </div>

        {messages.length > 1 && (
          <Button variant="outline" size="sm" onClick={handleClear} className="gap-1.5 text-xs">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
            Clear Chat History
          </Button>
        )}
      </div>

      {settingsLoading ? (
        <div className="space-y-4 rounded-lg border border-border bg-card p-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[350px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col rounded-lg border border-border bg-card shadow-sm overflow-hidden">
          {/* Header Bar inside Chat Container */}
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Personalized Assistant</h2>
                <p className="text-xs text-muted-foreground">
                  Workspace: <span className="font-mono">{workspaceId.slice(0, 8)}...</span>
                </p>
              </div>
            </div>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Powered by Knowledge Base
            </span>
          </div>

          {/* Messages Area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-background/50"
            style={{ height: "480px" }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div key={idx} className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
                  {!isUser && (
                    <span className="mb-1 ml-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" /> Assistant
                    </span>
                  )}
                  <div
                    className={`max-w-[88%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-xs"
                        : "bg-muted/80 text-foreground border border-border/50 rounded-bl-xs"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      <MarkdownRenderer content={m.content} />
                    )}
                  </div>
                </div>
              );
            })}

            {busy && messages[messages.length - 1]?.role === "user" && (
              <div className="flex flex-col items-start">
                <span className="mb-1 ml-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary animate-spin" /> Thinking...
                </span>
                <div className="rounded-2xl rounded-bl-xs bg-muted/80 border border-border/50 px-4 py-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion Chips */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-border/40 bg-muted/20 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MessageSquare className="h-3 w-3" /> Quick Prompts:
              </span>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  disabled={busy}
                  onClick={() => sendMessage(s)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground hover:bg-muted hover:border-primary/50 transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="border-t border-border bg-card p-3 sm:p-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your bot a question or test a prompt..."
                disabled={busy}
                className="flex-1 rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
              />
              <Button type="submit" disabled={busy || !input.trim()} className="gap-1.5 px-4">
                {busy ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
