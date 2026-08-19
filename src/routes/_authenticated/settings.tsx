import { createFileRoute } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";
import { SettingsPage } from "@/features/settings";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — " + BRAND_NAME }] }),
  component: SettingsPage,
});
