import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { EmailDraftsPage } from "@/features/drafts";

export const Route = createFileRoute("/_authenticated/email-drafts/")({
  head: () => ({ meta: [{ title: "Draft Generator — " + BRAND_NAME }] }),
  component: EmailDraftsPage,
});
