/**
 * Knowledge Base admin page.
 *
 * Upload .md / .txt / .pdf files. We parse to text in the browser, then
 * call ingestDocument (server fn) which chunks + embeds + stores in pgvector.
 *
 * Designed to match the dashboard's combined card layout exactly.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/skeletons";
import { ingestDocument, listDocuments, deleteDocument } from "@/lib/kb.functions";
import { ingestImage, listImages, removeImage } from "@/lib/images.functions";
import {
  FileText,
  FileUp,
  Loader2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Check,
  ExternalLink,
} from "lucide-react";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB soft limit

type Step = "upload" | "extract" | "chunk" | "embed" | "save";
type StepStatus = "pending" | "running" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  upload: "Uploading file…",
  extract: "Extracting text…",
  chunk: "Chunking content…",
  embed: "Generating embeddings…",
  save: "Saving to knowledge base…",
};
const STEP_ORDER: Step[] = ["upload", "extract", "chunk", "embed", "save"];

export function KbPage() {
  const list = useServerFn(listDocuments);
  const ingest = useServerFn(ingestDocument);
  const del = useServerFn(deleteDocument);
  const qc = useQueryClient();

  const { data: docs, isLoading } = useQuery({
    queryKey: ["kb-docs"],
    queryFn: () => list(),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<Step, StepStatus>>(blankSteps());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Document deleted from knowledge base.");
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
    },
    onError: () => {
      toast.error("Failed to delete document.");
    },
  });

  const listImg = useServerFn(listImages);
  const ingestImg = useServerFn(ingestImage);
  const delImg = useServerFn(removeImage);

  const { data: images, isLoading: imagesLoading } = useQuery({
    queryKey: ["kb-images"],
    queryFn: () => listImg(),
  });

  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState<string | null>(null);
  const [imgSuccess, setImgSuccess] = useState<string | null>(null);
  const [selectedImg, setSelectedImg] = useState<File | null>(null);
  const [imgPreviewUrl, setImgPreviewUrl] = useState<string | null>(null);
  const [imgName, setImgName] = useState("");
  const [imgTags, setImgTags] = useState("");
  const [imgCaption, setImgCaption] = useState("");

  const imgFileInput = useRef<HTMLInputElement>(null);

  const delImgMut = useMutation({
    mutationFn: (args: { id: string; image_url: string }) => delImg({ data: args }),
    onSuccess: () => {
      toast.success("Image deleted.");
      qc.invalidateQueries({ queryKey: ["kb-images"] });
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  function handleImgChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedImg(null);
      setImgPreviewUrl(null);
      return;
    }
    setImgName(file.name.replace(/\.[^/.]+$/, ""));
    setSelectedImg(file);
    setImgPreviewUrl(URL.createObjectURL(file));
  }

  async function handleImgSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedImg || !imgName.trim()) return;

    setImgBusy(true);
    setImgError(null);
    setImgSuccess(null);

    try {
      const reader = new FileReader();
      reader.onerror = () => {
        setImgError("Failed to read file.");
        setImgBusy(false);
      };
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          await ingestImg({
            data: {
              filename: selectedImg.name,
              base64,
              name: imgName.trim(),
              tags: imgTags.trim() || undefined,
              caption: imgCaption.trim() || undefined,
            },
          });
          setImgSuccess("Image uploaded successfully.");
          toast.success(`Image "${imgName.trim()}" uploaded.`);
          setSelectedImg(null);
          setImgPreviewUrl(null);
          setImgName("");
          setImgTags("");
          setImgCaption("");
          if (imgFileInput.current) imgFileInput.current.value = "";
          qc.invalidateQueries({ queryKey: ["kb-images"] });
        } catch (err: any) {
          setImgError(err.message || "Upload failed");
          toast.error(err?.message || "Image upload failed.");
        } finally {
          setImgBusy(false);
        }
      };
      reader.readAsDataURL(selectedImg);
    } catch (err: any) {
      setImgError(err.message || "Upload failed");
      setImgBusy(false);
    }
  }

  function reset() {
    setSteps(blankSteps());
    setError(null);
    setCurrentFile(null);
  }

  function setStep(s: Step, status: StepStatus) {
    setSteps((prev) => ({ ...prev, [s]: status }));
  }

  async function processFile(file: File) {
    reset();
    setCurrentFile(file.name);
    setSuccess(null);

    setStep("upload", "running");
    let buffer: ArrayBuffer | string;
    try {
      if (file.name.toLowerCase().endsWith(".pdf")) {
        buffer = await file.arrayBuffer();
      } else {
        buffer = await file.text();
      }
      setStep("upload", "done");
    } catch (e) {
      setStep("upload", "error");
      throw e;
    }

    setStep("extract", "running");
    let text: string;
    try {
      if (typeof buffer === "string") {
        text = buffer;
      } else {
        text = await extractPdfText(buffer);
      }
      if (!text.trim()) {
        throw new Error("No text could be extracted from this file.");
      }
      setStep("extract", "done");
    } catch (e) {
      setStep("extract", "error");
      throw e;
    }

    setStep("chunk", "running");
    setStep("embed", "running");
    setStep("save", "running");
    try {
      const res = await ingest({
        data: {
          filename: file.name,
          mime_type: file.type || undefined,
          text,
        },
      });
      setStep("chunk", "done");
      setStep("embed", "done");
      setStep("save", "done");
      setSuccess(
        `✅ ${file.name} successfully added to your knowledge base (${res.chunk_count} chunks).`,
      );
      toast.success(`${file.name} uploaded to knowledge base.`);
    } catch (e) {
      setStep("chunk", "done");
      setStep("embed", "error");
      setStep("save", "error");
      toast.error(`Failed to upload ${file.name}.`);
      throw e;
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
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
        } catch (e) {
          setError(`${file.name}: ${e instanceof Error ? e.message : "Upload failed."}`);
        }
      }
      qc.invalidateQueries({ queryKey: ["kb-docs"] });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Show all files including automated corrections (review chunks)
  const userDocs = docs ?? [];

  return (
    <div className="space-y-6">
      {/* Page Title & Breadcrumb */}
      <div className="pb-2 border-b border-border">
        <h1 className="text-xl font-semibold text-slate-900">Knowledge Base</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload and manage your company documents for AI training. Changes take effect instantly.
        </p>
      </div>

      {/* Combined Knowledge Base Card exactly matching dashboard style */}
      <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
        {/* Top Section: Upload Box */}
        <div className="p-4 sm:p-5 bg-secondary/10">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-dashed p-4 transition-all duration-200 ${
              isDragging
                ? "border-primary bg-primary/5 shadow-inner scale-[1.002]"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-center gap-3.5 text-center sm:text-left">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors ${
                  isDragging ? "text-primary" : "text-primary/80"
                }`}
              >
                <FileUp className="h-5 w-5 stroke-[2]" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-foreground">
                  {isDragging ? "Drop your files here!" : "Upload .md, .txt, or .pdf files"}
                </p>
                <p className="text-[10px] text-muted-foreground">10 MB recommended max per file</p>
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={busy}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded bg-[#f0533c] hover:bg-[#d83f29] text-white px-4 py-1.5 text-xs font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Choose Files</span>
                )}
              </button>
            </div>
          </div>

          {(busy || currentFile) && (
            <ProgressPanel
              file={currentFile}
              steps={steps}
              error={error}
              onRetry={() => fileInputRef.current?.click()}
            />
          )}

          {success && !busy && (
            <p className="mt-3 rounded-md bg-emerald-50 border border-emerald-200 p-2 text-xs text-emerald-800">
              {success}
            </p>
          )}
        </div>

        {/* Bottom Section: Documents List */}
        <div>
          <div className="bg-secondary/20 px-4 py-2.5 flex items-center justify-between border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              ALL DOCUMENTS ({userDocs.length})
            </span>
          </div>

          {isLoading ? (
            <div className="p-4">
              <ListSkeleton rows={3} />
            </div>
          ) : userDocs.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">
              No documents. Upload your first product brochure or spec sheet above.
            </div>
          ) : (
            <ul className="divide-y divide-border bg-background">
              {userDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-secondary/10 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <FileText className="h-4.5 w-4.5 text-muted-foreground shrink-0 stroke-[1.8]" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {doc.filename}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {doc.chunk_count} chunks · Uploaded on{" "}
                        {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove "${doc.filename}" from knowledge base?`)) {
                          delMut.mutate(doc.id);
                        }
                      }}
                      className="rounded border border-red-200 bg-background px-3 py-1 text-xs font-medium text-red-600 shadow-2xs hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Image Library section */}
      <div className="mt-6">
        <div className="pb-2 border-b border-border mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Image Library
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Embed images inline if customer questions align with the image's tags.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* Left Column: Form */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-900">Upload Image</h3>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-lg border border-dashed border-border p-4 bg-secondary/10 transition-all duration-200">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0533c]/10 text-[#f0533c]">
                  <ImageIcon className="h-5 w-5 stroke-[2]" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-foreground">Upload Image</p>
                  <p className="text-[10px] text-muted-foreground">
                    Select an image to add tags & upload
                  </p>
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <input
                  ref={imgFileInput}
                  type="file"
                  accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                  onChange={handleImgChange}
                  disabled={imgBusy}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => imgFileInput.current?.click()}
                  disabled={imgBusy}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded bg-[#f0533c] hover:bg-[#d83f29] text-white px-4 py-1.5 text-xs font-semibold shadow-sm transition active:scale-[0.98] disabled:opacity-60"
                >
                  Choose Image
                </button>
              </div>
            </div>

            <form onSubmit={handleImgSubmit} className="space-y-4">
              {imgPreviewUrl && (
                <div className="space-y-3 pt-3 border-t border-border w-full">
                  <div className="flex justify-center bg-secondary/10 p-2 rounded border border-dashed border-border w-full max-w-xs mx-auto">
                    <img src={imgPreviewUrl} className="max-h-24 object-contain rounded" />
                  </div>

                  <div className="space-y-2 w-full text-left">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-0.5">
                        Image Name *
                      </label>
                      <input
                        value={imgName}
                        onChange={(e) => setImgName(e.target.value)}
                        disabled={imgBusy}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-primary"
                        required
                        placeholder="e.g. Stainless Steel Boiler Image"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-0.5">
                        Search Tags (keywords)
                      </label>
                      <input
                        value={imgTags}
                        onChange={(e) => setImgTags(e.target.value)}
                        disabled={imgBusy}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-primary"
                        placeholder="e.g. boiler specs stainless steel layout image"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-0.5">
                        Visible Caption
                      </label>
                      <input
                        value={imgCaption}
                        onChange={(e) => setImgCaption(e.target.value)}
                        disabled={imgBusy}
                        className="w-full rounded border border-input bg-background px-2 py-1 text-xs text-foreground focus:border-primary"
                        placeholder="Shown directly beneath the image in chat"
                      />
                    </div>
                  </div>
                </div>
              )}

              {selectedImg && (
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={imgBusy || !imgName.trim()}
                    className="rounded bg-[#f0533c] hover:bg-[#d83f29] text-white px-4 py-1.5 text-xs font-semibold shadow-sm transition-all"
                  >
                    {imgBusy ? "Uploading..." : "Upload Image"}
                  </button>
                  {imgError && <span className="text-xs text-destructive">{imgError}</span>}
                  {imgSuccess && <span className="text-xs text-emerald-600">{imgSuccess}</span>}
                </div>
              )}
            </form>
          </div>

          {/* Right Column: Images List */}
          <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden flex flex-col">
            <div className="bg-secondary/20 border-b border-border px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              WORKSPACE IMAGES ({images?.length ?? 0})
            </div>
            <div className="flex-1 overflow-y-auto max-h-[360px]">
              {imagesLoading ? (
                <div className="p-4">
                  <ListSkeleton rows={2} />
                </div>
              ) : !images || images.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No diagrams uploaded. Use the form on the left to upload.
                </div>
              ) : (
                <ul className="divide-y divide-border bg-background">
                  {images.map((img: any) => (
                    <li
                      key={img.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <a
                          href={img.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0"
                        >
                          <img
                            src={img.image_url}
                            className="w-10 h-10 object-cover rounded border border-border"
                          />
                        </a>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{img.name}</div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            Tags: {img.tags || "—"}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Delete image "${img.name}"?`))
                            delImgMut.mutate({ id: img.id, image_url: img.image_url });
                        }}
                        className="rounded border border-red-200 bg-background px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressPanel({
  file,
  steps,
  error,
  onRetry,
}: {
  file: string | null;
  steps: Record<Step, StepStatus>;
  error: string | null;
  onRetry: () => void;
}) {
  const done = STEP_ORDER.filter((s) => steps[s] === "done").length;
  const pct = Math.round((done / STEP_ORDER.length) * 100);
  return (
    <div className="mt-3 rounded border border-border bg-background p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate font-semibold text-foreground">{file ?? "Processing…"}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-2.5 space-y-1 text-xs">
        {STEP_ORDER.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <StepIcon status={steps[s]} index={i + 1} />
            <span
              className={
                steps[s] === "done"
                  ? "text-foreground font-medium"
                  : steps[s] === "error"
                    ? "text-destructive font-semibold"
                    : steps[s] === "running"
                      ? "text-foreground font-bold animate-pulse"
                      : "text-muted-foreground"
              }
            >
              {STEP_LABELS[s]}
            </span>
          </li>
        ))}
      </ol>
      {error && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          <span>{error}</span>
          <button
            onClick={onRetry}
            className="rounded border border-destructive/40 px-2 py-0.5 hover:bg-destructive/20 text-[10px] font-semibold"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") return <span className="text-primary text-[10px]">✓</span>;
  if (status === "error") return <span className="text-destructive text-[10px]">✕</span>;
  if (status === "running")
    return (
      <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-primary border-r-transparent" />
    );
  return (
    <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-border text-[9px] text-muted-foreground">
      {index}
    </span>
  );
}

function blankSteps(): Record<Step, StepStatus> {
  return {
    upload: "pending",
    extract: "pending",
    chunk: "pending",
    embed: "pending",
    save: "pending",
  };
}

/** Extract plain text from a PDF in the browser using pdfjs-dist. */
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
