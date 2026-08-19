import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/automations")({
  beforeLoad: () => {
    throw redirect({ to: "/automations" });
  },
});
