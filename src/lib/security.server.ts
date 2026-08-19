/**
 * Shared server-side security helpers: CORS origin allow-listing, HTML
 * sanitisation of untrusted third-party content (Gmail bodies), and the
 * response security headers applied to every HTML document.
 */

/**
 * Build CORS headers for the public API endpoints.
 *
 * These endpoints are intentionally embeddable from any origin (customer
 * websites host the chat widget), so the allow-origin is a wildcard. They
 * carry no cookies or Authorization-based auth — the workspace is selected
 * by an explicit id in the request body — so wildcard CORS exposes nothing
 * that isn't already public.
 */
export function corsHeadersFor(_request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "600",
  };
}

/**
 * Strip all markup from untrusted HTML (e.g. a Gmail message body) and return
 * plain text. Scripts, styles, event handlers, and embedded objects are
 * removed outright rather than escaped, so the result is safe to render as
 * text anywhere in the app.
 */
export function sanitizeEmailBody(input: string): string {
  if (!input) return "";
  let out = input;

  // Remove entire dangerous elements including their content.
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|link|meta|svg|math)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,
    " ",
  );
  // Remove any self-closing / unterminated variants of the same tags.
  out = out.replace(
    /<\s*\/?\s*(script|style|iframe|object|embed|link|meta|svg|math)\b[^>]*>/gi,
    " ",
  );
  // Comments (may hide conditional markup).
  out = out.replace(/<!--[\s\S]*?-->/g, " ");
  // Preserve line structure for block-level breaks.
  out = out.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  out = out.replace(/<\s*\/\s*(p|div|tr|li|h[1-6])\s*>/gi, "\n");
  // Everything else: drop the tag entirely (attributes included, so no
  // javascript:/onerror= payload survives).
  out = out.replace(/<[^>]*>/g, " ");

  // Decode the common entities so the text reads naturally, then neutralise
  // any angle brackets that reappear from double-encoded payloads.
  out = out
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
  out = out.replace(/<[^>]*>/g, " ");

  // Collapse runaway whitespace produced by tag removal.
  return out
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Security headers applied to HTML responses.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Content-Security-Policy": [
    "default-src 'self'",
    // Vite/TanStack inline hydration scripts + Google Identity Services (GSI)
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https: https://*.googleusercontent.com https://accounts.google.com",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com https://accounts.google.com https://oauth2.googleapis.com https://*.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'self' *",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; "),
};

/** Clone a response with the security headers attached. */
export function withSecurityHeaders(response: Response): Response {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
