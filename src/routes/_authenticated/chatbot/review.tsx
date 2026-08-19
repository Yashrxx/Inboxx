import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { ReviewPage } from "@/features/review";

export const Route = createFileRoute("/_authenticated/chatbot/review")({
  head: () => ({ meta: [{ title: "Review Notes — " + BRAND_NAME }] }),
  component: ReviewPage,
});
