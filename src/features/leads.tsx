/**
 * Lead dashboard. Lists leads grouped by category (Hot / Warm / Cold) with
 * newest activity first. Flags 'needs_human' leads at the top.
 *
 * Tabs: "App" shows native app leads (source = null). "Integrations" shows
 * distinct external `source` labels; click one to filter the view.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { listLeads, updateLeadStatus, getLeadThread, deleteLead } from "@/lib/leads.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";

type Lead = {
  id: string;
  session_id: string | null;
  name: string | null;
  contact: string | null;
  channel: string;
  source: string | null;
  source_domain: string | null;
  score: number;
  category: "cold" | "warm" | "hot";
  summary: string | null;
  status: "bot_handling" | "needs_human" | "handed_over" | "converted" | "dead";
  last_activity: string;
  created_at: string;
};

type Tab = { kind: "app" } | { kind: "integrations" } | { kind: "source"; name: string };

export function LeadsPage() {
  const list = useServerFn(listLeads);
  const setStatus = useServerFn(updateLeadStatus);
  const fetchThread = useServerFn(getLeadThread);
  const del = useServerFn(deleteLead);
  const qc = useQueryClient();

  const { data: leads, isLoading: leadsLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: () => list(),
    refetchInterval: 15000,
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; status: Lead["status"] }) => setStatus({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["leads"] });
      const prev = qc.getQueryData<Lead[]>(["leads"]);
      qc.setQueryData<Lead[]>(["leads"], (old) => (old ?? []).filter((l) => l.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["leads"], ctx.prev);
      toast.error("Failed to delete lead.");
    },
    onSuccess: () => toast.success("Lead deleted."),
    onSettled: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const [viewing, setViewing] = useState<Lead | null>(null);
  const [thread, setThread] = useState<
    Array<{
      id: string;
      incoming_text: string;
      answer_text: string;
      confidence_flag: boolean;
      created_at: string;
    }>
  >([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [tab, setTab] = useState<Tab>({ kind: "app" });

  async function openConversation(lead: Lead) {
    setViewing(lead);
    if (!lead.session_id) {
      setThread([]);
      return;
    }
    setThreadLoading(true);
    try {
      const rows = await fetchThread({ data: { sessionId: lead.session_id } });
      setThread(rows);
    } finally {
      setThreadLoading(false);
    }
  }

  const allLeads = (leads ?? []) as Lead[];

  const integrationSources = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of allLeads) {
      const key = l.source_domain ?? l.source;
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allLeads]);

  // Filter by active tab
  const filtered = useMemo(() => {
    if (tab.kind === "app") return allLeads.filter((l) => !l.source && !l.source_domain);
    if (tab.kind === "source")
      return allLeads.filter((l) => (l.source_domain ?? l.source) === tab.name);
    return [];
  }, [allLeads, tab]);

  const needsHuman = filtered.filter((l) => l.status === "needs_human");
  const hot = filtered.filter((l) => l.category === "hot" && l.status !== "needs_human");
  const warm = filtered.filter((l) => l.category === "warm" && l.status !== "needs_human");
  const cold = filtered.filter((l) => l.category === "cold" && l.status !== "needs_human");

  function confirmDelete(id: string) {
    if (confirm("Delete this lead? This cannot be undone.")) delMut.mutate(id);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold">Leads</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Auto-captured from customer chats and scored by AI. Scoring is an assist — every lead is
        visible, nothing is discarded.
      </p>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2 border-b border-border">
        <TabBtn active={tab.kind === "app"} onClick={() => setTab({ kind: "app" })}>
          App ({allLeads.filter((l) => !l.source && !l.source_domain).length})
        </TabBtn>
        <TabBtn
          active={tab.kind === "integrations" || tab.kind === "source"}
          onClick={() => setTab({ kind: "integrations" })}
        >
          Integrations ({integrationSources.reduce((a, [, n]) => a + n, 0)})
        </TabBtn>
      </div>

      {tab.kind === "integrations" || tab.kind === "source" ? (
        <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
          <IntegrationsSidebar
            sources={integrationSources}
            activeName={tab.kind === "source" ? tab.name : null}
            onSelect={(name) => setTab({ kind: "source", name })}
          />
          <div>
            {tab.kind === "integrations" && (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                {integrationSources.length === 0
                  ? "No integration traffic yet. Embed the chat widget on an external site — the calling domain will be captured automatically."
                  : "Select a domain on the left to view its leads."}
              </p>
            )}
            {tab.kind === "source" && (
              <>
                {needsHuman.length > 0 && (
                  <Section
                    title={`Needs human (${needsHuman.length})`}
                    tone="alert"
                    leads={needsHuman}
                    onOpen={openConversation}
                    onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
                    onDelete={confirmDelete}
                  />
                )}
                <Section
                  title={`Hot (${hot.length})`}
                  tone="hot"
                  leads={hot}
                  onOpen={openConversation}
                  onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
                  onDelete={confirmDelete}
                />
                <Section
                  title={`Warm (${warm.length})`}
                  tone="warm"
                  leads={warm}
                  onOpen={openConversation}
                  onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
                  onDelete={confirmDelete}
                />
                <Section
                  title={`Cold (${cold.length})`}
                  tone="cold"
                  leads={cold}
                  onOpen={openConversation}
                  onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
                  onDelete={confirmDelete}
                />
                {filtered.length === 0 && (
                  <p className="mt-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                    No leads from {tab.name} yet.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      ) : leadsLoading ? (
        <ListSkeleton className="mt-6" rows={4} />
      ) : (
        <>
          {needsHuman.length > 0 && (
            <Section
              title={`Needs human (${needsHuman.length})`}
              tone="alert"
              leads={needsHuman}
              onOpen={openConversation}
              onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
              onDelete={confirmDelete}
            />
          )}
          <Section
            title={`Hot (${hot.length})`}
            tone="hot"
            leads={hot}
            onOpen={openConversation}
            onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
            onDelete={confirmDelete}
          />
          <Section
            title={`Warm (${warm.length})`}
            tone="warm"
            leads={warm}
            onOpen={openConversation}
            onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
            onDelete={confirmDelete}
          />
          <Section
            title={`Cold (${cold.length})`}
            tone="cold"
            leads={cold}
            onOpen={openConversation}
            onTakeOver={(id) => mut.mutate({ id, status: "handed_over" })}
            onDelete={confirmDelete}
          />
          {filtered.length === 0 && (
            <p className="mt-6 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No leads in this view yet.
            </p>
          )}
        </>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Conversation — {viewing?.name || viewing?.contact || "Anonymous lead"}
            </DialogTitle>
          </DialogHeader>
          {threadLoading ? (
            <ListSkeleton rows={3} />
          ) : thread.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages logged for this lead yet.</p>
          ) : (
            <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
              {thread.map((t) => (
                <div key={t.id} className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()}
                    {t.confidence_flag && (
                      <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                        low confidence
                      </span>
                    )}
                  </div>
                  <div className="rounded-md bg-primary/10 p-2 text-sm">
                    <span className="font-semibold">Customer:</span> {t.incoming_text}
                  </div>
                  <div className="rounded-md bg-secondary p-2 text-sm">
                    <span className="font-semibold">Company:</span>{" "}
                    <span className="whitespace-pre-wrap">{t.answer_text}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function IntegrationsSidebar({
  sources,
  activeName,
  onSelect,
}: {
  sources: [string, number][];
  activeName: string | null;
  onSelect: (name: string) => void;
}) {
  return (
    <aside className="rounded-lg border border-border bg-card p-2">
      <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Integrations
      </div>
      {sources.length === 0 ? (
        <p className="px-2 py-3 text-xs text-muted-foreground">No external domains detected yet.</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {sources.map(([name, count]) => {
            const active = name === activeName;
            return (
              <li key={name}>
                <button
                  onClick={() => onSelect(name)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"
                  }`}
                >
                  <span className="truncate">{name}</span>
                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}

function Section({
  title,
  tone,
  leads,
  onOpen,
  onTakeOver,
  onDelete,
}: {
  title: string;
  tone: "alert" | "hot" | "warm" | "cold";
  leads: Lead[];
  onOpen: (l: Lead) => void;
  onTakeOver: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (leads.length === 0) return null;
  const titleCls =
    tone === "alert" ? "text-destructive" : tone === "hot" ? "text-primary" : "text-foreground";
  return (
    <section className="mt-6">
      <h2 className={`text-sm font-semibold uppercase tracking-wide ${titleCls}`}>{title}</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {leads.map((l) => (
          <LeadCard
            key={l.id}
            lead={l}
            alert={tone === "alert"}
            onOpen={() => onOpen(l)}
            onTakeOver={() => onTakeOver(l.id)}
            onDelete={() => onDelete(l.id)}
          />
        ))}
      </div>
    </section>
  );
}

function LeadCard({
  lead,
  alert,
  onOpen,
  onTakeOver,
  onDelete,
}: {
  lead: Lead;
  alert: boolean;
  onOpen: () => void;
  onTakeOver: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-lg border bg-card p-4 ${
        alert ? "border-destructive/40 ring-1 ring-destructive/20" : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{lead.name || lead.contact || "Anonymous"}</div>
          <div className="truncate text-xs text-muted-foreground">
            {lead.contact && lead.name ? lead.contact : null}
            {lead.contact || lead.name ? " · " : ""}
            via {lead.channel}
            {lead.source_domain
              ? ` · ${lead.source_domain}`
              : lead.source
                ? ` · ${lead.source}`
                : ""}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={alert ? "destructive" : "secondary"}>Score {lead.score}</Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {lead.status.replace("_", " ")}
          </Badge>
        </div>
      </div>

      {lead.summary && <p className="mt-2 text-sm text-foreground/80">{lead.summary}</p>}

      <div className="mt-2 text-xs text-muted-foreground">
        Last activity {new Date(lead.last_activity).toLocaleString()}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onOpen}>
          View conversation
        </Button>
        {lead.status !== "handed_over" && lead.status !== "converted" && lead.status !== "dead" && (
          <Button size="sm" onClick={onTakeOver}>
            Take Over
          </Button>
        )}
        <button
          onClick={onDelete}
          title="Delete lead"
          className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
