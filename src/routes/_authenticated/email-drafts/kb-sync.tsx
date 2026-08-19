import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { KbPage } from "@/features/kb";

export const Route = createFileRoute("/_authenticated/email-drafts/kb-sync")({
  head: () => ({ meta: [{ title: "Knowledge Base Sync — " + BRAND_NAME }] }),
  component: KbPage,
});
