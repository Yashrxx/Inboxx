/** Redirect /admin → /dashboard (admin tools now live under the dashboard) */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
