import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { ChatbotOverview } from "@/features/chatbot-overview";

export const Route = createFileRoute("/_authenticated/chatbot/")({
  head: () => ({ meta: [{ title: "Chatbot Overview — " + BRAND_NAME }] }),
  component: ChatbotOverview,
});
