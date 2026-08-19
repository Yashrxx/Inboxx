import { createFileRoute } from "@tanstack/react-router";

/** Public alias — Google Pub/Sub pushes here (bypasses site auth). */
export const Route = createFileRoute("/api/public/webhooks/gmail-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        console.log(
          "[Gmail Webhook Public Route] Received POST request at /api/public/webhooks/gmail-notifications",
        );
        const { handleGmailNotification } = await import("@/lib/webhooks.server");
        const response = await handleGmailNotification(request);
        console.log(
          `[Gmail Webhook Public Route] Handled POST request with HTTP status: ${response.status}`,
        );
        return response;
      },
    },
  },
});
