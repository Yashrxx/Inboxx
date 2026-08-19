import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/drafts")({
  beforeLoad: () => {
    throw redirect({ to: "/email-drafts" });
  },
});
