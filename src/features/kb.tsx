/**
 * Knowledge Base admin page.
 *
 * Upload .md / .txt / .pdf files. We parse to text in the browser, then
 * call ingestDocument (server fn) which chunks + embeds + stores in pgvector.
 *
 * NEW:
 *  - 10MB per-file soft limit with a clear warning and an "upload anyway"
 *    confirmation (does NOT hard-block the user).
 *  - Multi-step progress indicator covering upload → extract → chunk →
 *    embed + save, so the user can see exactly where the process is.
 */
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ListSkeleton } from "@/components/skeletons";
import { ingestDocument, listDocuments, deleteDocument } from "@/lib/kb.functions";
import { ingestImage, listImages, removeImage } from "@/lib/images.functions";

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

  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [steps, setSteps] = useState<Record<Step, StepStatus>>(blankSteps());
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-docs"] }),
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb-images"] }),
  });

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
          console.error("Upload error", err);
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

    // ---- Step 1: upload (we treat the file read as the "upload") ----
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

    // ---- Step 2: extract text ----
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

    // ---- Steps 3-5: chunking, embedding, saving all happen inside
    //              ingestDocument server-side. We show them in sequence
    //              and finalise once the call returns.
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
      // We don't know which server stage failed; mark embed+save as error.
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
        // Soft size check — warn but let the user proceed.
        if (file.size > MAX_SIZE_BYTES) {
          const proceed = confirm(
            `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB, ` +
              `which exceeds the 10 MB recommended limit.\n\n` +
              `Please split it into smaller files or reduce content to under ~50,000 words for best results.\n\n` +
              `Upload anyway? (chunking may be slow or incomplete)`,
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
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function retryLast() {
    if (fileInput.current) fileInput.current.click();
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground">Knowledge Base</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload .md, .txt, or .pdf files (10 MB recommended max). Re-uploading replaces the existing
        document. Text is chunked (~800 tokens, 100 overlap), embedded, and stored for semantic
        retrieval.
      </p>

      <div className="mt-5 rounded-lg border border-border bg-card p-5">
        <label className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".md,.txt,.pdf,text/markdown,text/plain,application/pdf"
            onChange={(e) => handleFiles(e.target.files)}
            disabled={busy}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />
          <span className="text-xs text-muted-foreground">
            Multiple files accepted · 10 MB max recommended.
          </span>
        </label>

        {(busy || currentFile) && (
          <ProgressPanel file={currentFile} steps={steps} error={error} onRetry={retryLast} />
        )}

        {success && !busy && (
          <p className="mt-3 rounded-md bg-secondary px-3 py-2 text-sm text-foreground">
            {success}
          </p>
        )}
      </div>

      <div className="mt-6 rounded-lg border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-sm font-medium">
          Documents ({docs?.length ?? 0})
        </div>
        {isLoading ? (
          <div className="px-5 py-6">
            <ListSkeleton rows={3} />
          </div>
        ) : !docs || docs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">
            No documents yet. Upload your first product brochure or spec sheet above.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {docs.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{d.filename}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.chunk_count} chunks · {new Date(d.created_at).toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${d.filename}"?`)) delMut.mutate(d.id);
                  }}
                  className="rounded-md border border-border px-3 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-foreground">Image Library</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload product images, sizing diagrams, and reference sheets. The bot will automatically
          embed these inline if the customer's question aligns with the image's tags.
        </p>

        <div className="mt-5 rounded-lg border border-border bg-card p-5">
          <form onSubmit={handleImgSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 w-full text-foreground">
                Select Image (.png, .jpg, .svg)
              </label>
              <input
                ref={imgFileInput}
                type="file"
                accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml"
                onChange={handleImgChange}
                disabled={imgBusy}
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {imgPreviewUrl && (
              <div className="flex flex-col sm:flex-row gap-5 items-start mt-2 border-t border-border pt-4">
                <img
                  src={imgPreviewUrl}
                  className="w-32 h-32 object-cover rounded-md border border-border"
                />

                <div className="flex-1 w-full space-y-3 relative">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Image Name *
                    </label>
                    <input
                      value={imgName}
                      onChange={(e) => setImgName(e.target.value)}
                      disabled={imgBusy}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary"
                      required
                      placeholder="e.g. 1000L Washer Specs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Search Tags (keywords)
                    </label>
                    <input
                      value={imgTags}
                      onChange={(e) => setImgTags(e.target.value)}
                      disabled={imgBusy}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary"
                      placeholder="e.g. 1000l washer stainless steel 316 specs diagram"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Visible Caption
                    </label>
                    <input
                      value={imgCaption}
                      onChange={(e) => setImgCaption(e.target.value)}
                      disabled={imgBusy}
                      className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary"
                      placeholder="Shown directly beneath the image in chat"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={imgBusy || !selectedImg || !imgName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {imgBusy ? "Uploading..." : "Upload Image"}
              </button>
              {imgError && <span className="text-sm text-destructive">{imgError}</span>}
              {imgSuccess && <span className="text-sm text-green-600">{imgSuccess}</span>}
            </div>
          </form>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3 text-sm font-medium">
            Workspace Images ({images?.length ?? 0})
          </div>
          {imagesLoading ? (
            <div className="px-5 py-6">
              <ListSkeleton rows={3} />
            </div>
          ) : !images || images.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No images. Upload your first diagram above.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {images.map((img: any) => (
                <li
                  key={img.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-sm"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <a href={img.image_url} target="_blank" rel="noreferrer" className="shrink-0">
                      <img
                        src={img.image_url}
                        className="w-12 h-12 object-cover rounded-md border border-border"
                      />
                    </a>
                    <div className="min-w-0">
                      <div className="truncate font-medium text-foreground">{img.name}</div>
                      <div className="text-xs text-muted-foreground max-w-lg truncate whitespace-nowrap">
                        <span className="font-semibold text-muted-foreground">Tags:</span>{" "}
                        {img.tags || "—"} &nbsp;&middot;&nbsp;
                        <span className="font-semibold text-muted-foreground">Caption:</span>{" "}
                        {img.caption || "—"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete image "${img.name}"?`))
                        delImgMut.mutate({ id: img.id, image_url: img.image_url });
                    }}
                    className="rounded-md border border-border px-3 py-1 text-xs text-destructive hover:bg-destructive/10 shrink-0"
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
    <div className="mt-4 rounded-md border border-border bg-background p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="truncate font-medium text-foreground">{file ?? "Processing…"}</span>
        <span>{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ol className="mt-3 space-y-1.5 text-sm">
        {STEP_ORDER.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <StepIcon status={steps[s]} index={i + 1} />
            <span
              className={
                steps[s] === "done"
                  ? "text-foreground"
                  : steps[s] === "error"
                    ? "text-destructive"
                    : steps[s] === "running"
                      ? "text-foreground"
                      : "text-muted-foreground"
              }
            >
              {STEP_LABELS[s]}
            </span>
          </li>
        ))}
      </ol>
      {error && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span>{error}</span>
          <button
            onClick={onRetry}
            className="rounded-md border border-destructive/40 px-2 py-1 hover:bg-destructive/20"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

function StepIcon({ status, index }: { status: StepStatus; index: number }) {
  if (status === "done") return <span className="text-primary">✓</span>;
  if (status === "error") return <span className="text-destructive">✕</span>;
  if (status === "running")
    return (
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-r-transparent" />
    );
  return (
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-border text-[10px] text-muted-foreground">
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
