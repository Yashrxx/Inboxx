import { createFileRoute } from "@tanstack/react-router";
import FeaturesPage from "@/pages/FeaturesPage";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: `Services — ${BRAND_NAME}` },
      {
        name: "description",
        content: `Explore the core services offered by ${BRAND_NAME}: Personalized AI Chatbot, Gmail Draft Generator, and Inbox Automation Rules.`,
      },
    ],
  }),
  component: FeaturesPage,
});
