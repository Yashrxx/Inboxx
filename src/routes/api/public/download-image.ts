import { createFileRoute } from "@tanstack/react-router";
import fs from "node:fs";
import path from "node:path";

export const Route = createFileRoute("/api/public/download-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const name = url.searchParams.get("name") || "hero-images.zip";

        // Security check: only allow known safe assets and zip bundles
        const allowed = [
          "home_hero.jpg",
          "login_hero.jpg",
          "signup_hero.jpg",
          "hero-images.zip",
          "alert-filter-files.zip",
          "complete-assets-and-automations.zip",
        ];
        if (!allowed.includes(name)) {
          return new Response("Not found", { status: 404 });
        }

        let filePath = path.join(process.cwd(), "public", name);
        if (!fs.existsSync(filePath)) {
          filePath = path.join(process.cwd(), "src", "assets", name);
        }
        if (!fs.existsSync(filePath)) {
          return new Response("File not found", { status: 404 });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const isZip = name.endsWith(".zip");
        const contentType = isZip ? "application/zip" : "image/jpeg";
        const disposition = isZip ? `attachment; filename="${name}"` : "inline";

        return new Response(fileBuffer, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Disposition": disposition,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
