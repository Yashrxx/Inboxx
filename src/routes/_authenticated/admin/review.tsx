import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/review")({
  beforeLoad: () => {
    throw redirect({ to: "/chatbot/review" });
  },
});
