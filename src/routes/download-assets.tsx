import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Download,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  FolderArchive,
  Code2,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export const Route = createFileRoute("/download-assets")({
  head: () => ({
    meta: [
      { title: `Download Assets & Code Bundles — ${BRAND_NAME}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DownloadAssetsPage,
});

const ZIP_BUNDLES = [
  {
    id: "hero-images.zip",
    title: "Hero Images Package (.ZIP)",
    description:
      "Contains all 3 images (home_hero.jpg, login_hero.jpg, signup_hero.jpg) in root and images/ format.",
    filename: "hero-images.zip",
    size: "3.6 MB",
    icon: FolderArchive,
    downloadUrl: "/api/public/download-image?name=hero-images.zip",
  },
  {
    id: "alert-filter-files.zip",
    title: "Alert Filter Code Files (.ZIP)",
    description:
      "Contains automations.server.ts, automations.functions.ts, automations.tsx, and gmail-notifications.ts.",
    filename: "alert-filter-files.zip",
    size: "21 KB",
    icon: Code2,
    downloadUrl: "/api/public/download-image?name=alert-filter-files.zip",
  },
  {
    id: "complete-assets-and-automations.zip",
    title: "Complete All-in-One Bundle (.ZIP)",
    description:
      "Contains all 3 image assets + all alert filtering source code in their correct project directory structure.",
    filename: "complete-assets-and-automations.zip",
    size: "3.7 MB",
    icon: FolderArchive,
    downloadUrl: "/api/public/download-image?name=complete-assets-and-automations.zip",
  },
];

const IMAGES = [
  {
    id: "home_hero.jpg",
    title: "Homepage Hero Background",
    description: "Used as the main hero background banner on the homepage.",
    filename: "home_hero.jpg",
    previewUrl: "/api/public/download-image?name=home_hero.jpg",
    downloadUrl: "/api/public/download-image?name=home_hero.jpg",
  },
  {
    id: "login_hero.jpg",
    title: "Sign In Page Card Photo",
    description: "Used as the left split panel photo on /login.",
    filename: "login_hero.jpg",
    previewUrl: "/api/public/download-image?name=login_hero.jpg",
    downloadUrl: "/api/public/download-image?name=login_hero.jpg",
  },
  {
    id: "signup_hero.jpg",
    title: "Sign Up Page Card Photo",
    description: "Used as the left split panel photo on /signup.",
    filename: "signup_hero.jpg",
    previewUrl: "/api/public/download-image?name=signup_hero.jpg",
    downloadUrl: "/api/public/download-image?name=signup_hero.jpg",
  },
];

function DownloadAssetsPage() {
  return (
    <div className="min-h-screen bg-[#fafafc] text-slate-900 flex flex-col justify-between font-sans">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#f0533c] transition px-3 py-1.5 rounded-lg bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Home</span>
            </Link>
            <h1 className="text-base font-bold text-slate-900">Download Assets & Code Packages</h1>
          </div>

          <a
            href="/api/public/download-image?name=complete-assets-and-automations.zip"
            download="complete-assets-and-automations.zip"
            className="inline-flex items-center gap-2 rounded-full bg-[#f0533c] hover:bg-[#d9442e] text-white text-xs font-bold px-4 py-2 shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Full ZIP Package</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-10 flex-1 w-full space-y-8">
        {/* ZIP Bundles Section */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FolderArchive className="h-5 w-5 text-[#f0533c]" />
            <h2 className="text-lg font-bold text-slate-900">One-Click ZIP Downloads</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ZIP_BUNDLES.map((zip) => {
              const Icon = zip.icon;
              return (
                <div
                  key={zip.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-[#f0533c] border border-orange-100">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {zip.size}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{zip.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        {zip.description}
                      </p>
                    </div>
                  </div>

                  <a
                    href={zip.downloadUrl}
                    download={zip.filename}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#f0533c] hover:bg-[#d9442e] text-white text-xs font-semibold py-2.5 px-4 shadow-xs transition"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download {zip.filename}</span>
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* Individual Image Files */}
        <div className="pt-4">
          <div className="flex items-center gap-2 mb-4">
            <ImageIcon className="h-5 w-5 text-[#f0533c]" />
            <h2 className="text-lg font-bold text-slate-900">
              Individual Image Previews & Downloads
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {IMAGES.map((img) => (
              <div
                key={img.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <div className="relative aspect-4/3 bg-slate-100 border-b border-slate-100 overflow-hidden">
                  <img
                    src={img.previewUrl}
                    alt={img.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="text-xs font-semibold text-[#f0533c] uppercase tracking-wider">
                      {img.filename}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 mt-1">{img.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{img.description}</p>
                  </div>

                  <a
                    href={img.downloadUrl}
                    download={img.filename}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 shadow-xs transition"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download {img.filename}</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-6">
          <h3 className="text-sm font-bold text-slate-900">How to use in your local project</h3>
          <ul className="mt-3 space-y-2 text-xs text-slate-600">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Download <code>hero-images.zip</code> (or the complete bundle) and extract the files
                directly into your local project root.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Run <code>git add .</code> and{" "}
                <code>git commit -m "Add assets and automations"</code>.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                Run <code>git push</code> to update your GitHub repo and trigger a clean Vercel
                deploy.
              </span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
      </footer>
    </div>
  );
}
