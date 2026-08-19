import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { KbPage } from "@/features/kb";

export const Route = createFileRoute("/_authenticated/chatbot/kb")({
  head: () => ({ meta: [{ title: "Knowledge Base — " + BRAND_NAME }] }),
  component: KbPage,
});
