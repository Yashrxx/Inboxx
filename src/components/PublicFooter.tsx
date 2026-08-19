import React from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

interface PublicFooterProps {
  showCtaBanner?: boolean;
}

export default function PublicFooter({ showCtaBanner = true }: PublicFooterProps) {
  return (
    <footer className="mt-auto border-t border-slate-200/80 bg-white">
      {/* Dark CTA Banner (Matches uploaded image) */}
      {showCtaBanner && (
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-8 sm:px-6">
          <div className="rounded-3xl bg-[#0d1527] p-8 sm:p-14 text-center text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Ready to Automate Your Inbox &amp; Customer Support?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed font-normal max-w-xl mx-auto">
                Join hundreds of high-growth teams using {BRAND_NAME} Assistant to streamline email
                drafting, launch AI support chatbots, and receive instant Telegram alerts.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/signup"
                  className="rounded-full bg-[#f0533c] px-6 py-3 text-xs sm:text-sm font-semibold text-white transition hover:bg-[#d9442e] shadow-md inline-flex items-center gap-2"
                >
                  Start Free Trial <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="rounded-full border border-slate-700/80 bg-slate-800/80 px-6 py-3 text-xs sm:text-sm font-semibold text-slate-200 transition hover:bg-slate-700/90"
                >
                  Sign In to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Copyright & Links */}
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs text-slate-500 sm:flex-row">
        <span>
          © {new Date().getFullYear()} {BRAND_NAME}. All rights reserved.
        </span>
        <div className="flex flex-wrap justify-center gap-6">
          <Link to="/" className="hover:text-slate-900 transition">
            Home
          </Link>
          <Link to="/features" className="hover:text-slate-900 transition">
            Services
          </Link>
          <Link to="/privacy" className="hover:text-slate-900 transition">
            Privacy Policy
          </Link>
          <Link to="/terms" className="hover:text-slate-900 transition">
            Terms of Service
          </Link>
          <Link to="/download-assets" className="hover:text-[#f0533c] transition font-medium">
            Download Assets
          </Link>
        </div>
      </div>
    </footer>
  );
}
