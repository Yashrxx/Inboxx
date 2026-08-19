import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  beforeLoad: () => {
    throw redirect({ to: "/chatbot/leads" });
  },
});
