import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { getMyWorkspaceSettings } from "@/lib/workspace.functions";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { ingestDocument } from "@/lib/kb.functions";
import { listLogs, updateLog } from "@/lib/logs.functions";
import { toast } from "sonner";
import {
  Bot,
  Send,
  Trash2,
  Paperclip,
  MoreHorizontal,
  FileText,
  RefreshCw,
  FileUp,
  Plus,
  Check,
  AlertCircle,
  HelpCircle,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  Wrench,
  CheckCircle2,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

type TemporaryDoc = {
  id: string;
  filename: string;
  text: string;
  byte_size: number;
  mime_type: string;
  isAddedToMain: boolean;
  addingPending: boolean;
};

const DEFAULT_WELCOME =
  "Hello! I'm your Inboxx Assistant. I can help you manage your conversations, set up automation rules, or answer any questions about the platform. How can I help you today?";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122 v4 UUID generator fallback for non-SSL/sandboxed environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function LiveBotPage() {
  const fetchSettings = useServerFn(getMyWorkspaceSettings);
  const fetchLogs = useServerFn(listLogs);
  const mutateLog = useServerFn(updateLog);

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

  // In-line message editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState<string>("");

  // Temporary testing sandbox files state (Secondary Knowledge Base)
  const [temporaryDocs, setTemporaryDocs] = useState<TemporaryDoc[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const sandboxFileInputRef = useRef<HTMLInputElement>(null);

  // Quick Fix & Retraining panel state
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [correctionNote, setCorrectionNote] = useState("");
  const [submittingFix, setSubmittingFix] = useState(false);

  // Stable session ID for this live testing session (uses safe v4 generator fallback)
  const sessionIdRef = useRef<string>(generateUUID());

  // Query live-bot's active database logs
  const { data: allLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["live-bot-logs", sessionIdRef.current],
    queryFn: () => fetchLogs({ data: { type: "chat", limit: 100 } }),
    enabled: !!workspaceId,
  });

  // Filter logs corresponding ONLY to the current active testing session
  const sessionLogs = (allLogs ?? []).filter((l) => l.session_id === sessionIdRef.current);

  // Initialize conversation with welcome message once settings load
  useEffect(() => {
    if (welcomeMessage && messages.length === 0) {
      setMessages([{ role: "assistant", content: welcomeMessage }]);
    }
  }, [welcomeMessage, messages.length]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, busy]);

  // Restart/Refresh conversation: resets state & creates fresh session ID
  const handleRefresh = () => {
    setMessages([{ role: "assistant", content: welcomeMessage }]);
    sessionIdRef.current = generateUUID();
    setFeedbackRating(null);
    setCorrectionNote("");
    toast.success("Conversation restarted successfully!");
    refetchLogs();
  };

  // Direct in-place editing of chat message content
  const updateMessageContent = (index: number, newContent: string) => {
    setMessages((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], content: newContent };
      return updated;
    });
    toast.success("Message modified locally!");
  };

  async function sendMessage(textToSend?: string) {
    const text = (textToSend ?? input).trim();
    if (!text || busy || !workspaceId) return;

    if (!textToSend) setInput("");

    // Setup history structure for server API
    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setBusy(true);

    try {
      // Dynamic injection of Sandbox temporary testing documents if they exist.
      // Prepend a clean contextual system override to the messages array so Gemini queries them first!
      let messagesToPost = nextMessages;
      if (temporaryDocs.length > 0) {
        const activeTemporaryDocs = temporaryDocs.filter((d) => !d.isAddedToMain);
        if (activeTemporaryDocs.length > 0) {
          const sandboxContext = activeTemporaryDocs
            .map(
              (doc, idx) =>
                `[TEMPORARY SANDBOX TESTING FILE ${idx + 1} - Name: ${doc.filename}]\n${doc.text}`,
            )
            .join("\n\n");

          // Prepend an instruction and sandbox payload directly into the user message turn to guarantee priority recall!
          const lastUserMsg = nextMessages[nextMessages.length - 1];
          const enrichedContent = `[SYSTEM TESTING NOTICE: The following are TEMPORARY SANDBOX files loaded by the testing admin. Prioritize answering the query using this temporary sandbox data before searching the global knowledge base.]\n\n${sandboxContext}\n\n[USER QUERY]\n${lastUserMsg.content}`;

          messagesToPost = [
            ...nextMessages.slice(0, -1),
            { role: "user", content: enrichedContent },
          ];
        }
      }

      const res = await fetch("/api/public/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          workspaceId,
          messages: messagesToPost,
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
      // Automatically refetch active logs so the Quick Fix panel is populated instantly!
      setTimeout(() => refetchLogs(), 1200);
    }
  }

  // Handle Drag & Drop / manual selection for Secondary Knowledge Base
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processTemporaryFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    if (temporaryDocs.length >= 5) {
      toast.error("Upload limit reached: You can only upload up to 5 temporary sandbox files.");
      return;
    }

    const availableSlots = 5 - temporaryDocs.length;
    const filesToLoad = Array.from(files).slice(0, availableSlots);

    if (files.length > availableSlots) {
      toast.warning(
        `Only the first ${availableSlots} file(s) will be uploaded to stay within the 5-file limit.`,
      );
    }

    for (let i = 0; i < filesToLoad.length; i++) {
      const file = filesToLoad[i];
      // Limit to text/markdown/pdf text reading
      const isText =
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md") ||
        file.name.endsWith(".json") ||
        file.type.startsWith("text/");

      if (!isText) {
        toast.error(`"${file.name}" is not a supported text file (.txt or .md).`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content.trim()) {
          toast.error(`"${file.name}" appears to be empty.`);
          return;
        }

        const newDoc: TemporaryDoc = {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          filename: file.name,
          text: content,
          byte_size: content.length,
          mime_type: file.type || "text/plain",
          isAddedToMain: false,
          addingPending: false,
        };

        setTemporaryDocs((prev) => [...prev, newDoc]);
        toast.success(`Loaded "${file.name}" into temporary testing sandbox!`);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processTemporaryFiles(e.dataTransfer.files);
  };

  const removeTemporaryDoc = (id: string) => {
    setTemporaryDocs((prev) => prev.filter((d) => d.id !== id));
    toast.success("Removed sandbox testing file.");
  };

  // Permanently promote a testing document from the Sandbox into the Workspace Main Knowledge Base
  const promoteToMainKb = async (doc: TemporaryDoc) => {
    setTemporaryDocs((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, addingPending: true } : d)),
    );

    try {
      await ingestDocument({
        filename: doc.filename,
        mime_type: doc.mime_type,
        text: doc.text,
      });

      setTemporaryDocs((prev) =>
        prev.map((d) =>
          d.id === doc.id ? { ...d, isAddedToMain: true, addingPending: false } : d,
        ),
      );
      toast.success(`Successfully added "${doc.filename}" permanently to the Main Knowledge Base!`);
    } catch (err: any) {
      setTemporaryDocs((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, addingPending: false } : d)),
      );
      toast.error(err?.message || "Failed to add document permanently to Knowledge Base.");
    }
  };

  // Submit log corrections and retrain the bot instantly
  const submitQuickFix = async (logId: string) => {
    if (!feedbackRating) {
      toast.error("Please rate the bot response (Good or Needs Fix) before submitting feedback.");
      return;
    }

    setSubmittingFix(true);
    try {
      await mutateLog({
        data: {
          id: logId,
          rating: feedbackRating,
          correction: correctionNote || null,
          status: feedbackRating === 1 ? "good" : "needs_fix",
        },
      });

      toast.success("Feedback saved! Bot was corrected and retrained with your correction.");
      setCorrectionNote("");
      setFeedbackRating(null);
      refetchLogs();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit correction notes.");
    } finally {
      setSubmittingFix(false);
    }
  };

  const SUGGESTIONS = [
    { text: "How do I start?", query: "How do I start?" },
    { text: "What can I do?", query: "What can you do?" },
    { text: "Pricing inquiry", query: "Can you tell me about the pricing options?" },
  ];

  const latestLog = sessionLogs[0];

  return (
    <div className="space-y-4">
      {/* Page Title header */}
      <div className="pb-1.5 flex items-center justify-between gap-3 border-b border-border">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 font-display">
            Live Testing & Sandbox
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Admin Testing Suite: Test conversations, edit chats, and trial sandbox files.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 text-xs text-[#f0533c] hover:text-white font-semibold bg-orange-50 border border-orange-200/60 hover:bg-[#f0533c] hover:border-transparent px-3 py-1.5 rounded-lg transition-all shadow-3xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Chat</span>
        </button>
      </div>

      {settingsLoading ? (
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-xs max-w-5xl mx-auto">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-5 items-stretch max-w-7xl mx-auto w-full">
          {/* LEFT AREA (75% width): Chat Panel */}
          <div className="w-full lg:w-[75%] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
            {/* Header Bar inside Chat Container */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                {/* Bot Avatar with Green Active status */}
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100/80 text-[#f0533c] font-black text-xs">
                    IA
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 leading-tight">
                    Inboxx Personal Assistant
                  </h2>
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span className="text-emerald-600 font-semibold">Live</span>
                    <span className="text-slate-300">•</span>
                    <span>Always here to help</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefresh}
                  title="Restart conversation"
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors flex items-center gap-1 text-xs font-semibold border border-slate-100"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Restart</span>
                </button>
                <MoreHorizontal className="h-5 w-5 text-slate-400 cursor-pointer hover:text-slate-600 transition-colors" />
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/30"
              style={{ height: "450px" }}
            >
              {/* Centered Date Separator */}
              <div className="flex justify-center py-2">
                <span className="rounded-full bg-slate-100/90 border border-slate-200/50 px-3 py-1 text-[10px] font-bold text-slate-400">
                  Today, 10:24 AM
                </span>
              </div>

              {messages.map((m, idx) => {
                const isUser = m.role === "user";
                const isEditing = editingIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {/* Bot Avatar on the left for Assistant messages */}
                    {!isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 border border-orange-200/40 text-[#f0533c] text-[10px] font-black">
                        IA
                      </div>
                    )}

                    <div className="space-y-3 max-w-[82%] relative group">
                      {isEditing ? (
                        <div className="rounded-xl border border-orange-200 bg-white p-3 space-y-2 min-w-[280px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full text-xs p-2 rounded border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none min-h-[70px]"
                          />
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="text-[9px] px-2 py-1 rounded bg-slate-100 font-bold text-slate-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                updateMessageContent(idx, editingText);
                                setEditingIndex(null);
                              }}
                              className="text-[9px] px-2 py-1 rounded bg-[#f0533c] font-bold text-white"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-4 py-3 text-sm leading-relaxed shadow-3xs group-hover:pr-8 transition-all ${
                            isUser
                              ? "bg-slate-100/90 text-slate-800 rounded-2xl rounded-tr-sm"
                              : "bg-orange-100/85 text-orange-950 border border-orange-200 rounded-2xl rounded-tl-sm font-medium"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          ) : (
                            <div className="markdown-body">
                              <MarkdownRenderer content={m.content} />
                            </div>
                          )}

                          {/* Quick Edit icon overlay on Hover */}
                          <button
                            onClick={() => {
                              setEditingIndex(idx);
                              setEditingText(m.content);
                            }}
                            className="absolute -top-1.5 -right-1.5 p-1 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-[#f0533c] opacity-0 group-hover:opacity-100 transition-opacity shadow-3xs"
                            title="Edit message locally"
                          >
                            <Edit2 className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* User Avatar on the right for user messages */}
                    {isUser && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white uppercase shadow-3xs">
                        U
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Thinking / Loader state */}
              {busy && messages[messages.length - 1]?.role === "user" && (
                <div className="flex items-start gap-2.5 justify-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-100 border border-orange-200/40 text-[#f0533c] text-[10px] font-black">
                    IA
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-orange-100/70 border border-orange-200/40 px-4 py-3 text-sm text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#f0533c]/60 animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#f0533c]/60 animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-[#f0533c]/60 animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Control & Suggestion area */}
            <div className="border-t border-slate-100 bg-white p-4">
              {/* Suggested Pill Buttons sitting neatly above input box */}
              <div className="flex flex-wrap items-center gap-2 mb-3.5">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    disabled={busy}
                    onClick={() => sendMessage(s.query)}
                    className="rounded-full border border-orange-100 bg-orange-50/20 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 disabled:opacity-50 shadow-3xs"
                  >
                    {s.text}
                  </button>
                ))}
              </div>

              {/* Input Bar Pill Container */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="relative flex items-center bg-slate-100/70 border border-slate-200/50 rounded-2xl px-4 py-2.5"
              >
                <Paperclip className="h-4.5 w-4.5 text-slate-400 mr-2 cursor-pointer hover:text-slate-600 transition-colors shrink-0" />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message here..."
                  disabled={busy}
                  className="flex-1 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none pr-12 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={busy || !input.trim()}
                  className="absolute right-2 p-2 rounded-full bg-[#f0533c] hover:bg-[#d83f29] disabled:bg-slate-300 text-white shadow-sm transition-all duration-200 shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              {/* Disclaimer text */}
              <p className="text-[10px] text-center text-slate-400 mt-3 leading-none">
                AI can make mistakes. Consider verifying important info.
              </p>
            </div>
          </div>

          {/* RIGHT AREA (25% width): Temporary Secondary KB & Quick Fix Panel */}
          <div className="w-full lg:w-[25%] space-y-4 flex flex-col">
            {/* CARD 1: Secondary KB Sandbox */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <FileText className="h-4.5 w-4.5 text-[#f0533c]" />
                <h3 className="text-sm font-bold text-slate-800 leading-tight">
                  Secondary KB{" "}
                  <span className="text-[10px] text-[#f0533c] font-bold uppercase tracking-wider bg-orange-50 px-1.5 py-0.5 rounded ml-1">
                    Sandbox
                  </span>
                </h3>
              </div>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Upload temporary files (`.txt`, `.md`) to test recall and response quality before
                committing them permanently to the main Knowledge Base.
              </p>

              {/* Drag & Drop Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => sandboxFileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-[#f0533c] bg-orange-50/25"
                    : "border-slate-200 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <input
                  ref={sandboxFileInputRef}
                  type="file"
                  multiple
                  accept=".txt,.md,text/plain,text/markdown"
                  onChange={(e) => processTemporaryFiles(e.target.files)}
                  className="hidden"
                />
                <FileUp className="h-6 w-6 text-slate-400 mb-1.5" />
                <p className="text-xs font-bold text-slate-700">Drop files here</p>
                <p className="text-[9px] text-slate-400 mt-0.5">or click to browse (Max 5 files)</p>
              </div>

              {/* Sandbox Loaded Files list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider pb-1">
                  <span>Temporary Files ({temporaryDocs.length}/5)</span>
                  {temporaryDocs.length > 0 && (
                    <button
                      onClick={() => setTemporaryDocs([])}
                      className="text-red-500 hover:text-red-600 font-semibold"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                {temporaryDocs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200/60 p-4 text-center bg-slate-50/10">
                    <HelpCircle className="h-5 w-5 text-slate-300 mx-auto mb-1" />
                    <p className="text-[10px] text-slate-400 leading-normal">
                      No temporary files uploaded. Load some to test live answers!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[160px] overflow-y-auto pr-0.5">
                    {temporaryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className={`rounded-xl border p-2.5 text-xs transition-all ${
                          doc.isAddedToMain
                            ? "bg-emerald-50/40 border-emerald-100"
                            : "bg-slate-50/50 border-slate-100 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate" title={doc.filename}>
                              {doc.filename}
                            </p>
                            <p className="text-[9px] text-slate-400 mt-0.5">
                              {(doc.byte_size / 1024).toFixed(1)} KB •{" "}
                              {doc.isAddedToMain ? (
                                <span className="text-emerald-600 font-semibold">Added to KB</span>
                              ) : (
                                <span className="text-[#f0533c] font-semibold">
                                  Temporary Testing
                                </span>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => removeTemporaryDoc(doc.id)}
                            className="text-slate-300 hover:text-red-600 p-0.5"
                            title="Remove from Sandbox"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Promote / Add to Main KB Button */}
                        {!doc.isAddedToMain && (
                          <div className="mt-2 pt-2 border-t border-slate-100/60 flex justify-end">
                            <button
                              onClick={() => promoteToMainKb(doc)}
                              disabled={doc.addingPending}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-[#f0533c] hover:text-white bg-orange-50 hover:bg-[#f0533c] px-2 py-1 rounded transition-colors disabled:opacity-50"
                            >
                              {doc.addingPending ? (
                                <>
                                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                  <span>Ingesting...</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="h-2.5 w-2.5" />
                                  <span>Add to Main KB</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {doc.isAddedToMain && (
                          <div className="mt-2 pt-1 border-t border-emerald-100 flex items-center justify-end text-[9px] font-bold text-emerald-600 gap-1">
                            <Check className="h-3 w-3" />
                            <span>Available in Main KB</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* CARD 2: Live Bot Quick Fix & Feedback Ingestion */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 flex-1">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <Wrench className="h-4.5 w-4.5 text-[#f0533c]" />
                <h3 className="text-sm font-bold text-slate-800 leading-tight">
                  Bot Feedback & Retraining
                </h3>
              </div>

              {sessionLogs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200/60 p-5 text-center bg-slate-50/10 min-h-[140px] flex flex-col items-center justify-center">
                  <Bot className="h-6 w-6 text-slate-300 mb-1.5" />
                  <p className="text-[11px] font-bold text-slate-700">No active exchanges logged</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal max-w-[180px] mx-auto">
                    Submit a message in the chat on the left to activate correction tools.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-orange-50/20 border border-orange-100/50 p-3 space-y-1.5 text-xs text-slate-700">
                    <p className="font-bold text-slate-800 uppercase tracking-wider text-[9px] text-[#f0533c]">
                      Latest Exchange logged
                    </p>
                    <div className="space-y-1 line-clamp-2">
                      <p className="truncate">
                        <strong className="text-slate-900">Q:</strong> {latestLog.incoming_text}
                      </p>
                      <p className="text-slate-500 truncate">
                        <strong className="text-slate-950 font-bold">A:</strong>{" "}
                        {latestLog.answer_text}
                      </p>
                    </div>
                  </div>

                  {/* Feedback Controls */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold text-slate-700">Rate answer quality:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setFeedbackRating(1)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all shadow-3xs ${
                          feedbackRating === 1
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <ThumbsUp className="h-3.5 w-3.5" />
                        <span>Good</span>
                      </button>
                      <button
                        onClick={() => setFeedbackRating(-1)}
                        className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-semibold transition-all shadow-3xs ${
                          feedbackRating === -1
                            ? "bg-red-50 border-red-300 text-red-700"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                        <span>Needs Fix</span>
                      </button>
                    </div>

                    {/* Correction Text Area */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-slate-700 flex justify-between items-center">
                        <span>Correction Note:</span>
                        <span className="text-[9px] text-muted-foreground font-normal italic">
                          Retrains chatbot automatically
                        </span>
                      </p>
                      <textarea
                        value={correctionNote}
                        onChange={(e) => setCorrectionNote(e.target.value)}
                        placeholder="Type the ideal response, correction or detail the bot should remember..."
                        className="w-full text-xs p-2 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#f0533c] min-h-[90px]"
                      />
                    </div>

                    {/* Submit Correction button */}
                    <button
                      onClick={() => submitQuickFix(latestLog.id)}
                      disabled={submittingFix || feedbackRating === null}
                      className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-white font-bold bg-[#f0533c] hover:bg-[#d83f29] disabled:bg-slate-200 disabled:text-slate-400 py-2 rounded-xl transition-all shadow-xs"
                    >
                      {submittingFix ? (
                        <>
                          <RefreshCw className="h-3 w-3 animate-spin" />
                          <span>Retraining Bot...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Submit & Retrain Bot</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
