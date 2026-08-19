import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/webhooks/gmail-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log(
          "[Gmail Webhook Route] Received POST request at /api/webhooks/gmail-notifications",
        );
        const { handleGmailNotification } = await import("@/lib/webhooks.server");
        const response = await handleGmailNotification(request);
        console.log(
          `[Gmail Webhook Route] Handled POST request with HTTP status: ${response.status}`,
        );
        return response;
      },
    },
  },
});
