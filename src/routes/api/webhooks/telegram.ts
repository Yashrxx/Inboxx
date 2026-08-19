import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/telegram")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleTelegramUpdate } = await import("@/lib/webhooks.server");
        return handleTelegramUpdate(request);
      },
    },
  },
});
