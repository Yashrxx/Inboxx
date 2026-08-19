import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { LeadsPage } from "@/features/leads";

export const Route = createFileRoute("/_authenticated/chatbot/leads")({
  head: () => ({ meta: [{ title: "Leads — " + BRAND_NAME }] }),
  component: LeadsPage,
});
