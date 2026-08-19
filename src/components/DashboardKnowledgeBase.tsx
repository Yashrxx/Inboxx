import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Database, FileText, Loader2, FileUp, ArrowRight, ExternalLink } from "lucide-react";
import { ingestDocument, listDocuments, deleteDocument } from "@/lib/kb.functions";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB soft limit

/** Extract plain text from a PDF in the browser using pdfjs-dist */
async function extractPdfText(buf: ArrayBuffer): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // @ts-expect-error - vite-only import suffix
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    parts.push(text);
  }
  return parts.join("\n\n");
}

export function DashboardKnowledgeBase() {
  const list = useServerFn(listDocuments);
  const ingest = useServerFn(ingestDocument);
  const del = useServerFn(deleteDocument);
  const qc = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: allDocs, isLoading } = useQuery({
    queryKey: ["kb-docs"],
    queryFn: () => list(),
  });

  // Filter out automated review feedback correction chunks so ONLY user-shared documents appear
  const userDocs = (allDocs ?? []).filter((d) => {
    const fn = d.filename.toLowerCase();
    return !fn.startsWith("admin_correction_") && !fn.includes("admin_correction_");
  });

  // Sort by latest created/updated date and slice to last 5
  const sortedDocs = [...userDocs].sort((a, b) => {
    const tA = new Date((a as any).updated_at || a.created_at).getTime();
    const tB = new Date((b as any).updated_at || b.created_at).getTime();
    return tB - tA;
  });
  const recentDocs = sortedDocs.slice(0, 5);

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onMutate: (id) => {
      setDeletingId(id);
    },
    onSuccess: () => {
      toast.success("Document deleted from knowledge base.");
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to delete document.");
    },
    onSettled: () => {
      setDeletingId(null);
    },
  });

  async function processFile(file: File) {
    let buffer: ArrayBuffer | string;
    if (file.name.toLowerCase().endsWith(".pdf")) {
      buffer = await file.arrayBuffer();
    } else {
      buffer = await file.text();
    }

    let text: string;
    if (typeof buffer === "string") {
      text = buffer;
    } else {
      text = await extractPdfText(buffer);
    }

    if (!text.trim()) {
      throw new Error("No readable text found in document.");
    }

    await ingest({
      data: {
        filename: file.name,
        mime_type: file.type || undefined,
        text,
      },
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_SIZE_BYTES) {
          const proceed = confirm(
            `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB, ` +
              `which exceeds the 10 MB recommended limit.\n\nUpload anyway?`,
          );
          if (!proceed) continue;
        }

        try {
          await processFile(file);
          toast.success(`"${file.name}" added to knowledge base.`);
        } catch (e: any) {
          toast.error(`${file.name}: ${e?.message || "Upload failed."}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function formatUploadDate(isoString: string) {
    try {
      const d = new Date(isoString);
      const datePart = d.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric",
      });
      const timePart = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `Uploaded on ${datePart}, ${timePart}`;
    } catch {
      return "Uploaded recently";
    }
  }

  return (
    <section className="space-y-4 pt-4">
      {/* Header matching provided design */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Knowledge Base
        </h2>
        <p className="mt-1 text-sm text-slate-500">Manage your documents for AI training.</p>
      </div>

      {/* Upload Box Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-4 sm:p-6">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-[#ea580c]">
              <FileUp className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-900">
                Upload .md, .txt, or .pdf files
              </p>
              <p className="text-xs sm:text-sm text-slate-500">10 MB recommended max per file</p>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.txt,.pdf,.docx,text/markdown,text/plain,application/pdf"
              onChange={(e) => handleFiles(e.target.files)}
              disabled={isUploading}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#b91c1c] hover:bg-[#991b1b] text-white px-5 py-2.5 text-sm font-bold shadow-xs transition active:scale-[0.98] disabled:opacity-60"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>Choose Files</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Documents List Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            RECENT DOCUMENTS ({recentDocs.length}
            {userDocs.length > 5 ? ` of ${userDocs.length}` : ""})
          </span>
          <Link
            to="/chatbot/kb"
            className="text-xs font-semibold text-[#f0533c] hover:text-[#d03e28] flex items-center gap-1 transition-colors"
          >
            Manage all in Knowledge Base <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4 min-h-[320px]">
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : recentDocs.length === 0 ? (
          <div className="px-6 py-16 min-h-[320px] flex flex-col items-center justify-center text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-[#f0533c] mb-3">
              <FileText className="h-6 w-6 stroke-[1.8]" />
            </div>
            <p className="text-base font-bold text-slate-800">
              Add your first file for your chatbot&apos;s knowledge base
            </p>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Upload your company documents, guides, or FAQs to start training your AI chatbot.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs font-bold transition active:scale-[0.98]"
            >
              <FileUp className="h-3.5 w-3.5" />
              Upload Document
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <FileText className="h-5 w-5 text-slate-400 shrink-0 stroke-[1.8]" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{doc.filename}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatUploadDate(doc.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove "${doc.filename}" from knowledge base?`)) {
                          deleteMut.mutate(doc.id);
                        }
                      }}
                      disabled={deletingId === doc.id}
                      className="rounded-lg border border-red-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-red-600 shadow-2xs hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
                    >
                      {deletingId === doc.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              ))}

              {/* Visibly allocate remaining slots up to 5 files */}
              {Array.from({ length: Math.max(0, 5 - recentDocs.length) }).map((_, i) => (
                <div
                  key={`empty-slot-${i}`}
                  className="flex items-center justify-between px-6 py-4 bg-slate-50/20 text-slate-400 select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0 pr-4">
                    <FileText className="h-5 w-5 text-slate-200 shrink-0 stroke-[1.5]" />
                    <span className="text-sm font-medium text-slate-400">--</span>
                  </div>
                  <span className="text-xs font-medium text-slate-300">--</span>
                </div>
              ))}
            </div>

            {userDocs.length > 5 && (
              <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-center">
                <Link
                  to="/chatbot/kb"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-[#f0533c] transition-colors"
                >
                  Browse all {userDocs.length} documents on Knowledge Base page
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
