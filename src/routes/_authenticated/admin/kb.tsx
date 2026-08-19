import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/kb")({
  beforeLoad: () => {
    throw redirect({ to: "/chatbot/kb" });
  },
});
