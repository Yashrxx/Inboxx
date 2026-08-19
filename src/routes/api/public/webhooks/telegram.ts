import { createFileRoute } from "@tanstack/react-router";

/** Public alias — Telegram pushes bot updates here (bypasses site auth). */
export const Route = createFileRoute("/api/public/webhooks/telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleTelegramUpdate } = await import("@/lib/webhooks.server");
        return handleTelegramUpdate(request);
      },
    },
  },
});
