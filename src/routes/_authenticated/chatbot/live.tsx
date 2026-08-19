import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { LiveBotPage } from "@/features/live-bot";

export const Route = createFileRoute("/_authenticated/chatbot/live")({
  head: () => ({ meta: [{ title: "Live Bot — " + BRAND_NAME }] }),
  component: LiveBotPage,
});
