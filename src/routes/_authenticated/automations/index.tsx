import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { RulesTab } from "@/features/automations";

export const Route = createFileRoute("/_authenticated/automations/")({
  head: () => ({ meta: [{ title: "Active Rules — " + BRAND_NAME }] }),
  component: RulesTab,
});
