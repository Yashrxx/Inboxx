import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { ReviewPage } from "@/features/review";

export const Route = createFileRoute("/_authenticated/email-drafts/history")({
  head: () => ({ meta: [{ title: "Draft History — " + BRAND_NAME }] }),
  component: ReviewPage,
});
