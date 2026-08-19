/**
 * Automations & Alerts — rule management + trigger history.
 */
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Search, FileText, FileWarning } from "lucide-react";
import {
  listAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  listAlertLogs,
  evaluateEmailAgainstRules,
  runRulesOnLatestEmails,
} from "@/lib/automations.functions";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { TableRowsSkeleton } from "@/components/skeletons";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const SOURCES = [
  { id: "body", label: "Body" },
  { id: "subject", label: "Subject" },
  { id: "sender", label: "Sender" },
  { id: "attachments", label: "Attachments" },
] as const;

type RuleRow = {
  id: string;
  rule_name: string;
  is_active: boolean;
  scan_sources: string[];
  operator: string;
  keywords: string[];
  ai_summarize: boolean;
  notify_telegram: boolean;
  tg_show_subject?: boolean;
  tg_show_sender?: boolean;
  tg_show_match_details?: boolean;
  tg_show_scanned_file?: boolean;
  tg_show_detailed_summary?: boolean;
};

export function AutomationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Automations &amp; Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Monitor incoming emails and attachments for keywords, and get alerted on Telegram when
          something matches.
        </p>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Active Rules</TabsTrigger>
          <TabsTrigger value="history">Alert &amp; Shortlist History</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4">
          <RulesTab />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function RulesTab() {
  const list = useServerFn(listAlertRules);
  const create = useServerFn(createAlertRule);
  const update = useServerFn(updateAlertRule);
  const remove = useServerFn(deleteAlertRule);
  const runRules = useServerFn(runRulesOnLatestEmails);

  const qc = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ["alert-rules"],
    queryFn: () => list(),
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RuleRow | null>(null);
  const [runningRules, setRunningRules] = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["alert-rules"] });

  const runRulesMut = useMutation({
    mutationFn: async () => {
      setRunningRules(true);
      try {
        toast.info("Fetching latest emails and running rules...");
        const res = await runRules({ data: {} } as any);
        toast.success(
          `Scanned ${res.emailsScanned} emails against ${res.rulesEvaluated} rules. Created ${res.matched} alert logs.`,
        );
        qc.invalidateQueries({ queryKey: ["alert-logs"] });
      } catch (e: any) {
        toast.error(e.message || "Failed to run rules on latest emails.");
      } finally {
        setRunningRules(false);
      }
    },
  });

  const saveMut = useMutation({
    mutationFn: async (form: {
      id?: string;
      rule_name: string;
      scan_sources: string[];
      operator: string;
      keywords: string[];
      topic_keywords?: string[];
      notify_on_missing_keyword?: boolean;
      ai_summarize: boolean;
      notify_telegram: boolean;
      tg_show_subject?: boolean;
      tg_show_sender?: boolean;
      tg_show_match_details?: boolean;
      tg_show_scanned_file?: boolean;
      tg_show_detailed_summary?: boolean;
    }) => (form.id ? update({ data: form as any }) : create({ data: form as any })),
    onSuccess: () => {
      toast.success(editing ? "Rule updated" : "Rule created");
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => update({ data: v as any }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Rule deleted");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-3 flex-wrap">
        <Button variant="outline" onClick={() => runRulesMut.mutate()} disabled={runningRules}>
          {runningRules ? "Running Rules..." : "Run Rules on Latest Emails"}
        </Button>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Create Rule
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rule</TableHead>
              <TableHead>Targets</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Keywords</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRowsSkeleton rows={4} columns={6} />}

            {!isLoading && (rules?.length ?? 0) === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  No rules yet. Create one to start monitoring.
                </TableCell>
              </TableRow>
            )}
            {(rules as RuleRow[] | undefined)?.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.rule_name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {r.scan_sources.map((s) => (
                      <Badge key={s} variant="secondary">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{r.operator}</TableCell>
                <TableCell className="max-w-[220px] truncate text-sm">
                  {r.keywords.join(", ")}
                </TableCell>
                <TableCell>
                  <Switch
                    checked={r.is_active}
                    onCheckedChange={(v) => toggleMut.mutate({ id: r.id, is_active: v })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <RuleDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        onSave={(form) => saveMut.mutate(form)}
        saving={saveMut.isPending}
      />
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  editing,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: RuleRow | null;
  onSave: (form: any) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [sources, setSources] = useState<string[]>(["subject", "body"]);
  const [operator, setOperator] = useState("contains");
  const [keywords, setKeywords] = useState("");
  const [topicKeywords, setTopicKeywords] = useState("");
  const [notifyMissing, setNotifyMissing] = useState(false);
  const [aiSummarize, setAiSummarize] = useState(false);
  const [notify, setNotify] = useState(true);
  const [tgShowSubject, setTgShowSubject] = useState(false);
  const [tgShowSender, setTgShowSender] = useState(false);
  const [tgShowMatchDetails, setTgShowMatchDetails] = useState(false);
  const [tgShowScannedFile, setTgShowScannedFile] = useState(false);
  const [tgShowDetailedSummary, setTgShowDetailedSummary] = useState(false);
  const [seeded, setSeeded] = useState<string | null>(null);

  // Seed form state whenever the dialog opens for a different rule.
  const seedKey = `${open}-${editing?.id ?? "new"}`;
  if (open && seeded !== seedKey) {
    setSeeded(seedKey);
    setName(editing?.rule_name ?? "");
    setSources(editing?.scan_sources ?? ["subject", "body"]);
    setOperator(editing?.operator ?? "contains");
    setKeywords(editing?.keywords?.join(", ") ?? "");
    setTopicKeywords((editing as any)?.topic_keywords?.join(", ") ?? "");
    setNotifyMissing((editing as any)?.notify_on_missing_keyword ?? false);
    setAiSummarize(editing?.ai_summarize ?? false);
    setNotify(editing?.notify_telegram ?? true);
    setTgShowSubject((editing as any)?.tg_show_subject ?? false);
    setTgShowSender((editing as any)?.tg_show_sender ?? false);
    setTgShowMatchDetails((editing as any)?.tg_show_match_details ?? false);
    setTgShowScannedFile((editing as any)?.tg_show_scanned_file ?? false);
    setTgShowDetailedSummary((editing as any)?.tg_show_detailed_summary ?? false);
  }

  function submit() {
    const kw = keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (!name.trim()) return toast.error("Rule name is required.");
    if (sources.length === 0) return toast.error("Pick at least one target.");
    const topics = topicKeywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    if (kw.length === 0) return toast.error("Add at least one keyword.");
    if (notifyMissing && topics.length === 0)
      return toast.error("Add at least one topic keyword to use missing-keyword alerts.");
    onSave({
      ...(editing ? { id: editing.id } : {}),
      rule_name: name.trim(),
      scan_sources: sources,
      operator,
      keywords: kw,
      topic_keywords: topics,
      notify_on_missing_keyword: notifyMissing,
      ai_summarize: aiSummarize,
      notify_telegram: notify,
      tg_show_subject: tgShowSubject,
      tg_show_sender: tgShowSender,
      tg_show_match_details: tgShowMatchDetails,
      tg_show_scanned_file: tgShowScannedFile,
      tg_show_detailed_summary: tgShowDetailedSummary,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit rule" : "Create rule"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pr-2">
          <div className="space-y-2">
            <Label>Rule name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dean notice / shortlist watch"
            />
          </div>

          <div className="space-y-2">
            <Label>Search targets</Label>
            <div className="flex flex-wrap gap-4">
              {SOURCES.map((s) => (
                <label key={s.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={sources.includes(s.id)}
                    onCheckedChange={(v) =>
                      setSources((prev) => (v ? [...prev, s.id] : prev.filter((x) => x !== s.id)))
                    }
                  />
                  {s.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Operator</Label>
            <Select value={operator} onValueChange={setOperator}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">Contains</SelectItem>
                <SelectItem value="exact">Exact match</SelectItem>
                <SelectItem value="regex">Regex</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Keywords / IDs (comma separated)</Label>
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="21BCE1234, shortlist, interview"
            />
          </div>

          <div className="space-y-2">
            <Label>Topic keywords (comma separated)</Label>
            <Input
              value={topicKeywords}
              onChange={(e) => setTopicKeywords(e.target.value)}
              placeholder="placement drive, shortlist"
            />
            <p className="text-xs text-muted-foreground">
              Used to recognise the right emails for missing-keyword alerts.
            </p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <Label>Notify if my keyword is NOT found</Label>
              <p className="text-xs text-muted-foreground">
                Alert when an email matches the topic above but none of your keywords/IDs appear.
              </p>
            </div>
            <Switch checked={notifyMissing} onCheckedChange={setNotifyMissing} />
          </div>

          <div className="flex items-center justify-between">
            <Label>AI summarize match</Label>
            <Switch checked={aiSummarize} onCheckedChange={setAiSummarize} />
          </div>
          <div className="flex items-center justify-between">
            <Label>Send Telegram alert</Label>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </div>

          <div className="space-y-2 pt-3 border-t">
            <Label className="text-sm font-semibold">Telegram Message Preferences</Label>
            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={tgShowSubject} onCheckedChange={(v) => setTgShowSubject(!!v)} />
                Show Subject
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={tgShowSender} onCheckedChange={(v) => setTgShowSender(!!v)} />
                Show Sender Email
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={tgShowMatchDetails}
                  onCheckedChange={(v) => setTgShowMatchDetails(!!v)}
                />
                Show Matched/Unmatched Keywords
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={tgShowScannedFile}
                  onCheckedChange={(v) => setTgShowScannedFile(!!v)}
                />
                Show Scanned Source File
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={tgShowDetailedSummary}
                  onCheckedChange={(v) => setTgShowDetailedSummary(!!v)}
                />
                Show Detailed AI Summary
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="sticky bottom-0 bg-background pt-3 pb-1">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----- Attachment status badge component ----- */

const ATTACHMENT_STATUS_CONFIG: Record<string, { label: string; color: string; tooltip: string }> =
  {
    PARSED: {
      label: "Parsed",
      color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      tooltip: "Attachment scanned fully (100% accuracy)",
    },
    RAW_SCANNED: {
      label: "Raw Scanned",
      color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      tooltip:
        "Large Excel file (>2MB): Scanned via raw string matching. Some formula cells may be omitted.",
    },
    SKIPPED_EXCEEDED_SIZE: {
      label: "Size Exceeded",
      color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      tooltip: "Attachment skipped (>30MB exceeds maximum scan range).",
    },
    SKIPPED_UNSUPPORTED_TYPE: {
      label: "Unsupported",
      color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
      tooltip: "Attachment not scanned: File type outside text parser range.",
    },
  };

function AttachmentStatusBadge({
  status,
  filename,
}: {
  status?: string | null;
  filename?: string | null;
}) {
  if (!status) return null;
  const cfg = ATTACHMENT_STATUS_CONFIG[status];
  if (!cfg) return null;

  const fileExt = filename ? filename.split(".").pop()?.toLowerCase() : null;
  const tooltipText = fileExt
    ? cfg.tooltip.replace("File type", `File type (.${fileExt})`)
    : cfg.tooltip;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight cursor-help ${cfg.color}`}
          >
            {status === "PARSED" ? (
              <FileText className="h-3 w-3" />
            ) : (
              <FileWarning className="h-3 w-3" />
            )}
            {cfg.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function HistoryTab() {
  const list = useServerFn(listAlertLogs);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["alert-logs", query, page],
    queryFn: () => list({ data: { search: query || undefined, page, pageSize: 25 } }),
  });

  const rows = data?.rows ?? [];
  const totalPages = useMemo(() => Math.max(1, Math.ceil((data?.count ?? 0) / 25)), [data?.count]);

  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(0);
          setQuery(search);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search subject, sender, keyword or file…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline">
          Filter
        </Button>
      </form>

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Subject / Sender</TableHead>
              <TableHead>Matched</TableHead>
              <TableHead>Source file</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRowsSkeleton rows={5} columns={6} />}

            {!isLoading && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-sm text-muted-foreground">
                  No alerts logged yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((log: any) => (
              <TableRow key={log.id} className="cursor-pointer" onClick={() => setSelected(log)}>
                <TableCell className="text-xs">
                  {new Date(log.triggered_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-sm">
                  {log.alert_rules?.rule_name ?? "(deleted rule)"}
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <div className="truncate text-sm">{log.email_subject}</div>
                  <div className="truncate text-xs text-muted-foreground">{log.sender_email}</div>
                </TableCell>
                <TableCell className="text-sm">
                  <Badge variant="secondary">{log.matched_keyword}</Badge>{" "}
                  <span className="text-xs text-muted-foreground">{log.matched_source}</span>
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-xs">
                  {log.source_filename ?? log.attachment_name ?? "—"}
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex flex-col gap-1">
                    <span>{log.notification_status}</span>
                    <AttachmentStatusBadge
                      status={log.attachment_status}
                      filename={log.source_filename ?? log.attachment_name}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page + 1} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selected?.email_subject}</SheetTitle>
            <SheetDescription>
              From {selected?.sender_email} ·{" "}
              {selected && new Date(selected.triggered_at).toLocaleString()}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-6 text-sm">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Matched</div>
              <p>
                {selected?.matched_keyword} in {selected?.matched_source}
                {selected?.source_filename ? ` (${selected.source_filename})` : ""}
              </p>
            </div>
            {(selected?.attachment_name || selected?.attachment_status) && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">Attachment</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selected?.attachment_name && (
                    <span className="text-sm font-medium">{selected.attachment_name}</span>
                  )}
                  {selected?.attachment_size != null && (
                    <span className="text-xs text-muted-foreground">
                      ({(selected.attachment_size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                  <AttachmentStatusBadge
                    status={selected?.attachment_status}
                    filename={selected?.attachment_name}
                  />
                </div>
              </div>
            )}
            {selected?.ai_summary && (
              <div>
                <div className="text-xs font-medium text-muted-foreground">AI summary</div>
                <p className="whitespace-pre-wrap">{selected.ai_summary}</p>
              </div>
            )}
            <div>
              <div className="text-xs font-medium text-muted-foreground">Preview</div>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                {selected?.extracted_preview ?? "No preview captured."}
              </pre>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
