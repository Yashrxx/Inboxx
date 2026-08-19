/**
 * Server-only RAG helpers: embed text via Gemini API (@google/genai), search the
 * pgvector knowledge base, build a context string for the prompt.
 *
 * This file must only be imported from server functions / server routes.
 */
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const EMBED_MODEL = "gemini-embedding-001";
export const CHAT_MODEL = "gemini-3.5-flash";
export const CANDIDATE_CHAT_MODELS = [
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-3.7-flash",
];

export function getGeminiClient(): GoogleGenAI {
  const rawKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!rawKey) throw new Error("GEMINI_API_KEY is not configured.");

  const apiKey = rawKey.trim();
  const prefix = apiKey.substring(0, 10);
  console.log(
    `[getGeminiClient] Initializing client. Key length: ${apiKey.length}, prefix: ${prefix}...`,
  );

  if (apiKey.startsWith("ya29.")) {
    console.log(
      "[getGeminiClient] Injected OAuth token detected. Initializing using Authorization Bearer header.",
    );
    return new GoogleGenAI({
      apiKey: undefined,
      httpOptions: {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      },
    });
  }

  return new GoogleGenAI({ apiKey });
}

/** Robust text generation with automatic multi-model fallback for quota/rate limits. */
export async function generateContentWithFallback(params: { contents: any; config?: any }) {
  const ai = getGeminiClient();
  let lastErr: any = null;
  for (const model of CANDIDATE_CHAT_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { response: res, model };
    } catch (err: any) {
      console.warn(
        `[Gemini Generation] Model ${model} failed, trying fallback:`,
        err?.message || err,
      );
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Robust streaming generation with automatic multi-model fallback for quota/rate limits. */
export async function generateContentStreamWithFallback(params: { contents: any; config?: any }) {
  const ai = getGeminiClient();
  let lastErr: any = null;
  for (const model of CANDIDATE_CHAT_MODELS) {
    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: params.contents,
        config: params.config,
      });
      return { stream, model };
    } catch (err: any) {
      console.warn(`[Gemini Stream] Model ${model} failed, trying fallback:`, err?.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
}

/** Embed a single string and return the embedding vector. */
export async function embedText(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const res = (await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: text,
  })) as any;
  const values = res.embedding?.values || res.embeddings?.[0]?.values;
  if (!values) {
    throw new Error("Failed to generate embedding vector from Gemini.");
  }
  return values;
}

/** Embed many strings with retry backoff for rate limits. */
export async function embedMany(texts: string[]): Promise<number[][]> {
  const ai = getGeminiClient();
  const out: number[][] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    let attempt = 0;
    const maxRetries = 5;
    let delayMs = 1000;

    while (true) {
      try {
        const res = (await ai.models.embedContent({
          model: EMBED_MODEL,
          contents: text,
        })) as any;
        const values = res.embedding?.values || res.embeddings?.[0]?.values;
        if (!values) {
          throw new Error("Invalid embedding response or missing vector values.");
        }
        out.push(values);
        break;
      } catch (err: any) {
        const isRateLimit =
          err?.status === 429 ||
          err?.statusCode === 429 ||
          String(err?.message || err).includes("429") ||
          String(err?.message || err).includes("RESOURCE_EXHAUSTED");

        if (isRateLimit && attempt < maxRetries) {
          console.warn(
            `Embedding rate limited. Retrying in ${delayMs}ms (Attempt ${attempt + 1}/${maxRetries}).`,
          );
          await new Promise((r) => setTimeout(r, delayMs));
          attempt++;
          delayMs *= 2;
          continue;
        }
        throw err;
      }
    }
  }

  return out;
}

export type KbMatch = {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
  filename: string;
};

/** Run vector search across kb_chunks. */
export async function searchKb(
  query: string,
  workspaceId: string,
  matchCount = 5,
): Promise<KbMatch[]> {
  const embedding = await embedText(query);
  // pgvector expects the embedding as a string like "[0.1,0.2,...]"
  const { data, error } = await supabaseAdmin.rpc("match_kb_chunks", {
    query_embedding: embedding as unknown as string,
    workspace_id_filter: workspaceId,
    match_count: matchCount,
  });
  const matches = (data ?? []) as KbMatch[];

  let imageMatches: KbMatch[] = [];
  try {
    const { data: images } = await supabaseAdmin
      .from("kb_images")
      .select("id, name, tags, caption, image_url")
      .eq("workspace_id", workspaceId);

    if (images && images.length > 0) {
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);

      const relevantImages = images.filter((img) => {
        const target = `${img.name || ""} ${img.tags || ""}`.toLowerCase();
        return target.includes(queryLower) || queryWords.some((w) => target.includes(w));
      });

      imageMatches = relevantImages.slice(0, 3).map((img) => {
        const safeCaption = (img.caption || img.name || "Image").replace(/\s+/g, " ").trim();
        return {
          id: `img_${img.id}`,
          document_id: "image",
          content: `AVAILABLE IMAGE FOR THIS QUERY: [Image Name: ${img.name}]\nMarkdown to use: ![${safeCaption}](${img.image_url})\nTo display this image, output EXACTLY the Markdown shown above ONLY IF the image is clearly relevant to the customer's question. Do not output this image if not relevant.`,
          similarity: 1.0,
          filename: "__IMAGE__",
        };
      });
    }
  } catch (e) {
    console.error("Failed to fetch images", e);
  }

  return [...imageMatches, ...matches];
}

/** Format matched chunks into a CONTEXT block for the model. */
export function buildContextBlock(matches: KbMatch[]): string {
  const textMatches = matches.filter((m) => m.filename !== "__IMAGE__");
  const imageMatches = matches.filter((m) => m.filename === "__IMAGE__");

  let imgContext = "";
  if (imageMatches.length > 0) {
    imgContext =
      "\n\n=== RELEVANT IMAGES AVAILABLE ===\n" +
      imageMatches.map((m) => m.content).join("\n\n") +
      "\n===================================";
  }

  if (textMatches.length === 0) {
    return "CONTEXT: (no knowledge base documents matched this query)" + imgContext;
  }
  const parts = textMatches.map(
    (m, i) =>
      `--- Source ${i + 1} (from "${m.filename}", similarity ${m.similarity.toFixed(2)}) ---\n${m.content}`,
  );
  return `CONTEXT (use only this to answer):\n\n${parts.join("\n\n")}` + imgContext;
}

/**
 * Chunk plain text into ~800-token windows with 100-token overlap.
 * Token ≈ 4 chars heuristic → window 3200 chars, overlap 400 chars.
 */
export function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  const WINDOW = 3200;
  const OVERLAP = 400;
  if (clean.length <= WINDOW) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + WINDOW, clean.length);
    // try to break at a paragraph or sentence boundary near the end
    if (end < clean.length) {
      const slice = clean.slice(start, end);
      const lastBreak = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "));
      if (lastBreak > WINDOW * 0.6) end = start + lastBreak + 1;
    }
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - OVERLAP;
  }
  return chunks.filter((c) => c.length > 20);
}
