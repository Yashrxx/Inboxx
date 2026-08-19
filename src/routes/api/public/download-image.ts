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

        // Map request names directly to pristine backup binaries to bypass git repository file corruption on external deployments
        if (name === "home_hero.jpg") {
          filePath = path.join(
            process.cwd(),
            "src",
            "assets",
            "images",
            "workspace_hero_bg_1787032051238.jpg",
          );
        } else if (name === "login_hero.jpg") {
          filePath = path.join(
            process.cwd(),
            "src",
            "assets",
            "images",
            "office_hero_login_1787028506237.jpg",
          );
        } else if (name === "signup_hero.jpg") {
          filePath = path.join(
            process.cwd(),
            "src",
            "assets",
            "images",
            "office_team_signup_1787029114301.jpg",
          );
        } else if (!fs.existsSync(filePath)) {
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
