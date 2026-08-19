/**
 * Legacy /auth entrypoint — redirects to the new /login page so old links
 * (e.g. "Admin" header link) continue to work.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
