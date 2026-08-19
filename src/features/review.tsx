/**
 * Review / feedback page. Lists every logged answer (chat + email_draft),
 * highlights low-confidence rows, and lets the admin rate them with
 * thumbs up/down + a correction note.
 *
 * Tabs partition rows by origin: App (source = null) vs Integrations
 * (grouped by `source` label — e.g. "portfolio", "resume-site").
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/skeletons";
import { Trash2 } from "lucide-react";
import { listLogs, updateLog, getQualityStats, deleteLog } from "@/lib/logs.functions";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Tab = { kind: "app" } | { kind: "integrations" } | { kind: "source"; name: string };

export function ReviewPage() {
  const list = useServerFn(listLogs);
  const stats = useServerFn(getQualityStats);
  const update = useServerFn(updateLog);
  const del = useServerFn(deleteLog);
  const qc = useQueryClient();

  const { data: logs } = useQuery({
    queryKey: ["logs-all"],
    queryFn: () => list({ data: { limit: 200 } }),
  });
  const { data: quality } = useQuery({
    queryKey: ["logs-stats"],
    queryFn: () => stats(),
  });

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>({ kind: "app" });

  const mut = useMutation({
    mutationFn: (vars: {
      id: string;
      rating?: number | null;
      correction?: string | null;
      status?: "good" | "needs_fix";
    }) => update({ data: vars }),
    onMutate: (vars) => {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.add(vars.id);
        return next;
      });
    },
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      qc.invalidateQueries({ queryKey: ["logs-all"] });
      qc.invalidateQueries({ queryKey: ["logs-stats"] });
    },
    onError: () => toast.error("Failed to save feedback."),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["logs-all"] });
      const prev = qc.getQueryData<any[]>(["logs-all"]);
      qc.setQueryData<any[]>(["logs-all"], (old) => (old ?? []).filter((r) => r.id !== id));
      return { prev };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.prev) qc.setQueryData(["logs-all"], ctx.prev);
      toast.error("Failed to delete review.");
    },
    onSuccess: () => {
      toast.success("Review deleted.");
      qc.invalidateQueries({ queryKey: ["logs-stats"] });
    },
  });

  const allLogs = (logs ?? []) as any[];

  const integrationSources = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of allLogs) {
      const key = l.source_domain ?? l.source;
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [allLogs]);

  const filteredByTab = useMemo(() => {
    if (tab.kind === "app") return allLogs.filter((l) => !l.source && !l.source_domain);
    if (tab.kind === "source")
      return allLogs.filter((l) => (l.source_domain ?? l.source) === tab.name);
    return [];
  }, [allLogs, tab]);

  const visibleLogs = filteredByTab.filter(
    (row) => row.rating === null && !row.correction && !hiddenIds.has(row.id),
  );

  function confirmDelete(id: string) {
    if (confirm("Delete this review row? This cannot be undone.")) delMut.mutate(id);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-900">Review &amp; Feedback</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Auto-flagged answers are highlighted. Rate and add corrections — these are recorded for a
        human to fold into the knowledge base.
      </p>

      <div className="mt-4 flex gap-3 text-sm">
        <StatPill label="Good" value={quality?.good ?? 0} tone="good" />
        <StatPill label="Needs fix" value={quality?.needs_fix ?? 0} tone="bad" />
        <StatPill label="Total logged" value={quality?.total ?? 0} />
      </div>

      {/* Tabs */}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-border">
        <TabBtn active={tab.kind === "app"} onClick={() => setTab({ kind: "app" })}>
          App ({allLogs.filter((l) => !l.source && !l.source_domain).length})
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
          <aside className="rounded-lg border border-border bg-card p-2">
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Integrations
            </div>
            {integrationSources.length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No external domains detected yet.
              </p>
            ) : (
              <ul className="mt-1 space-y-0.5">
                {integrationSources.map(([name, count]) => {
                  const active = tab.kind === "source" && tab.name === name;
                  return (
                    <li key={name}>
                      <button
                        onClick={() => setTab({ kind: "source", name })}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:bg-secondary"
                        }`}
                      >
                        <span className="truncate">{name}</span>
                        <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </aside>
          <div className="space-y-3">
            {tab.kind === "integrations" ? (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                {integrationSources.length === 0
                  ? "No integration traffic yet. Embed the widget on an external site — the calling domain is captured automatically."
                  : "Select a domain on the left to view its reviews."}
              </p>
            ) : !logs ? (
              <ListSkeleton rows={3} />
            ) : visibleLogs.length === 0 ? (
              <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                No unreviewed answers from {tab.name}.
              </p>
            ) : (
              visibleLogs.map((row) => (
                <LogRow
                  key={row.id}
                  log={row as LogRowT}
                  onAct={(v) => mut.mutate({ id: row.id, ...v })}
                  onDelete={() => confirmDelete(row.id)}
                />
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {!logs ? (
            <ListSkeleton rows={3} />
          ) : visibleLogs.length === 0 ? (
            <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              No unreviewed answers.
            </p>
          ) : (
            visibleLogs.map((row) => (
              <LogRow
                key={row.id}
                log={row as LogRowT}
                onAct={(v) => mut.mutate({ id: row.id, ...v })}
                onDelete={() => confirmDelete(row.id)}
              />
            ))
          )}
        </div>
      )}
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

function StatPill({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" }) {
  const cls =
    tone === "good"
      ? "bg-primary/10 text-primary"
      : tone === "bad"
        ? "bg-destructive/10 text-destructive"
        : "bg-secondary text-secondary-foreground";
  return (
    <div className={`rounded-md px-3 py-2 ${cls}`}>
      <div className="text-xs">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

type LogRowT = {
  id: string;
  type: "chat" | "email_draft";
  incoming_text: string;
  answer_text: string;
  confidence_flag: boolean;
  rating: number | null;
  correction: string | null;
  status: string;
  created_at: string;
  source: string | null;
  source_domain: string | null;
};

function LogRow({
  log,
  onAct,
  onDelete,
}: {
  log: LogRowT;
  onAct: (v: {
    rating?: number | null;
    correction?: string | null;
    status?: "good" | "needs_fix";
  }) => void;
  onDelete: () => void;
}) {
  const [correction, setCorrection] = useState(log.correction ?? "");
  const [rating, setRating] = useState<number | null>(log.rating);
  const [status, setStatus] = useState<string>(log.status);

  const handleSubmit = () => {
    onAct({
      rating,
      status: status as any,
      correction: correction || null,
    });
  };

  return (
    <div
      className={`rounded-lg border bg-card p-4 ${
        log.confidence_flag ? "border-destructive/40 ring-1 ring-destructive/20" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-secondary px-2 py-0.5">{log.type}</span>
          <span>{new Date(log.created_at).toLocaleString()}</span>
          {log.confidence_flag && (
            <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-destructive">
              Low confidence
            </span>
          )}
          <span className="rounded-md bg-secondary px-2 py-0.5">{log.status}</span>
          {(log.source_domain || log.source) && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-primary">
              {log.source_domain ?? log.source}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setRating(1);
              setStatus("good");
            }}
            className={`rounded-md px-2 py-1 text-base ${
              rating === 1 ? "bg-primary/15 text-primary" : "hover:bg-secondary"
            }`}
            title="Thumbs up"
          >
            👍
          </button>
          <button
            onClick={() => {
              setRating(-1);
              setStatus("needs_fix");
            }}
            className={`rounded-md px-2 py-1 text-base ${
              rating === -1 ? "bg-destructive/15 text-destructive" : "hover:bg-secondary"
            }`}
            title="Thumbs down"
          >
            👎
          </button>
          <button
            onClick={onDelete}
            title="Delete row"
            className="ml-1 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Question</div>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-secondary p-2 text-xs">
            {log.incoming_text}
          </pre>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground">Answer</div>
          <div className="mt-1 max-h-64 overflow-auto rounded-md bg-secondary p-3 text-xs">
            <MarkdownRenderer content={log.answer_text} />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-semibold uppercase text-muted-foreground">
          Correction note (for the team to fold into the KB)
        </div>
        <textarea
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-input bg-background p-2 text-xs outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          placeholder="e.g. The correct throughput for the 3-zone tray washer is 1200/hr, not 800/hr."
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleSubmit}
            className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            Submit Feedback
          </button>
        </div>
      </div>
    </div>
  );
}
