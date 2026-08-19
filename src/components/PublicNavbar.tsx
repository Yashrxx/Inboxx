import React from "react";
import { Link } from "@tanstack/react-router";
import { BRAND_NAME } from "@/lib/brand";

interface PublicNavbarProps {
  currentPage?: "home" | "services" | "privacy" | "terms";
  signedIn?: boolean;
  onPrimaryCta?: () => void;
  primaryCtaText?: string;
  busy?: boolean;
}

export default function PublicNavbar({
  currentPage = "home",
  signedIn = false,
  onPrimaryCta,
  primaryCtaText,
  busy = false,
}: PublicNavbarProps) {
  return (
    <header className="sticky top-0 z-50 px-4 py-4 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-slate-200/80 bg-white/90 px-6 py-3 shadow-sm backdrop-blur-md">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tight text-slate-900">{BRAND_NAME}</span>
        </Link>

        {/* Common Nav Pills: Home, Services */}
        <nav className="hidden md:flex items-center gap-1 rounded-full bg-slate-100/80 p-1 border border-slate-200/60 text-xs font-medium text-slate-600">
          <Link
            to="/"
            className={`rounded-full px-4 py-1.5 transition ${
              currentPage === "home"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Home
          </Link>
          <Link
            to="/features"
            className={`rounded-full px-4 py-1.5 transition ${
              currentPage === "services"
                ? "bg-white text-slate-900 shadow-2xs font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Services
          </Link>
        </nav>

        {/* Right Auth / CTA buttons */}
        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link
              to="/dashboard"
              className="rounded-full bg-[#f0533c] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#d9442e] shadow-sm"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition px-2"
              >
                Sign in
              </Link>

              {onPrimaryCta ? (
                <button
                  onClick={onPrimaryCta}
                  disabled={busy}
                  className="rounded-full bg-[#f0533c] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#d9442e] shadow-sm disabled:opacity-50"
                >
                  {busy ? "Opening…" : primaryCtaText || "Get Started Free"}
                </button>
              ) : (
                <Link
                  to="/signup"
                  className="rounded-full bg-[#f0533c] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#d9442e] shadow-sm"
                >
                  Get Started Free
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
