import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { HistoryTab } from "@/features/automations";

export const Route = createFileRoute("/_authenticated/automations/logs")({
  head: () => ({ meta: [{ title: "Alert Logs — " + BRAND_NAME }] }),
  component: HistoryTab,
});
