import { createFileRoute } from "@tanstack/react-router";
import Privacy from "@/pages/Privacy";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${BRAND_NAME}` },
      {
        name: "description",
        content: `${BRAND_NAME} Privacy Policy and Google OAuth Data Usage Disclosures.`,
      },
    ],
  }),
  component: Privacy,
});
