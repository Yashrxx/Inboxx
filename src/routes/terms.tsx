import { createFileRoute } from "@tanstack/react-router";
import Terms from "@/pages/Terms";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${BRAND_NAME}` },
      {
        name: "description",
        content: `${BRAND_NAME} Terms of Service agreement and user conditions.`,
      },
    ],
  }),
  component: Terms,
});
