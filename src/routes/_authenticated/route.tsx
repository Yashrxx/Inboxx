/**
 * Auth gate + comprehensive app shell with sidebar and top header matching the design.
 * Client-rendered (ssr:false) because Supabase stores the session in localStorage.
 */
import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutGrid,
  Bot,
  Mail,
  Zap,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  Inbox,
  User,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/lib/brand";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        return { user: sessionData.session.user };
      }
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) {
        throw redirect({ to: "/login" });
      }
      return { user: data.user };
    } catch (err) {
      if (err && typeof err === "object" && "to" in err) throw err;
      throw redirect({ to: "/login" });
    }
  },
  component: AdminShell,
});

const MENU_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid, exact: true },
  { to: "/chatbot", label: "Chatbots", icon: Bot },
  { to: "/email-drafts", label: "Email Drafts", icon: Mail },
  { to: "/automations", label: "Automations", icon: Zap },
  { to: "/chatbot/leads", label: "Analytics", icon: BarChart3 },
];

const GENERAL_ITEMS = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/chatbot/kb", label: "Help", icon: HelpCircle },
];

const MODULE_SUBNAVS: { prefix: string; nav: { to: string; label: string; exact?: boolean }[] }[] =
  [
    {
      prefix: "/chatbot",
      nav: [
        { to: "/chatbot", label: "Overview", exact: true },
        { to: "/chatbot/live", label: "Live Bot" },
        { to: "/chatbot/kb", label: "Knowledge Base" },
        { to: "/chatbot/leads", label: "Leads" },
        { to: "/chatbot/review", label: "Review Notes" },
      ],
    },
    {
      prefix: "/email-drafts",
      nav: [
        { to: "/email-drafts", label: "Draft Generator", exact: true },
        { to: "/email-drafts/kb-sync", label: "KB Sync" },
        { to: "/email-drafts/history", label: "Draft History" },
      ],
    },
    {
      prefix: "/automations",
      nav: [
        { to: "/automations", label: "Active Rules", exact: true },
        { to: "/automations/telegram", label: "Telegram Setup" },
        { to: "/automations/logs", label: "Logs" },
      ],
    },
  ];

function AdminShell() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeModule = MODULE_SUBNAVS.find(
    (m) => pathname === m.prefix || pathname.startsWith(m.prefix + "/"),
  );

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.navigate({ to: "/login" });
  }

  // Derive user name or avatar initial
  const userMetadata = user.user_metadata || {};
  const fullName: string = userMetadata.full_name || user.email?.split("@")[0] || "Alex";
  const userAvatar: string | undefined = userMetadata.avatar_url;

  const isDashboardPage = pathname === "/dashboard" || pathname === "/dashboard/";

  return (
    <div
      className={`flex min-h-screen ${isDashboardPage ? "bg-[#f3f4f5]" : "bg-[#fafafc]"} font-sans antialiased text-slate-900`}
    >
      {/* Mobile & Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 1. Left Sidebar Panel (Persistent on Dashboard for desktop, Drawer on other pages) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-slate-800 bg-[#0f172a] px-4 py-6 transition-transform duration-200 ease-in-out ${
          isDashboardPage
            ? mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:static lg:translate-x-0"
            : mobileOpen
              ? "translate-x-0 shadow-2xl"
              : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col">
          {/* Logo Header */}
          <div className="flex items-center justify-between px-2 pb-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-3"
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0533c] text-white shadow-xs">
                <Inbox className="h-5 w-5 stroke-[2.2]" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white leading-tight">
                  {BRAND_NAME}
                </span>
                <span className="text-[11px] font-medium text-slate-400">AI Assistant</span>
              </div>
            </Link>
            <button
              onClick={() => setMobileOpen(false)}
              className={`rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white ${
                isDashboardPage ? "lg:hidden" : ""
              }`}
              title="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* MENU Section */}
          <div className="mt-6">
            <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Menu
            </span>
            <nav className="mt-2 space-y-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? pathname === item.to || pathname === item.to + "/"
                  : pathname === item.to || pathname.startsWith(item.to + "/");

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#f0533c] text-white shadow-xs"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* GENERAL Section */}
          <div className="mt-6">
            <span className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              General
            </span>
            <nav className="mt-2 space-y-1">
              {GENERAL_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.to || pathname.startsWith(item.to + "/");

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-[#f0533c] text-white shadow-xs"
                        : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {/* Logout Action */}
              <button
                onClick={signOut}
                className="flex w-full items-center gap-3.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-300 transition-all hover:bg-slate-800/80 hover:text-rose-400"
              >
                <LogOut className="h-4 w-4 text-slate-400" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Bottom CTA: Upgrade Plan */}
        <div className="pt-6">
          <Link
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className="block w-full rounded-xl bg-[#f0533c] px-4 py-3 text-center text-sm font-bold text-white shadow-xs transition hover:bg-[#d9442e]"
          >
            Upgrade Plan
          </Link>
        </div>
      </aside>

      {/* 2. Main Content Wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-8">
          <div className="flex items-center gap-3 sm:gap-4 flex-1">
            {/* Hamburger Button: Shown on mobile for dashboard, shown on ALL screens for non-dashboard pages */}
            <button
              onClick={() => setMobileOpen(true)}
              className={`flex items-center gap-2 rounded-xl p-2 text-slate-700 hover:bg-slate-100 transition-all ${
                isDashboardPage
                  ? "lg:hidden"
                  : "bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs"
              }`}
              title="Open Navigation Menu"
              aria-label="Open Navigation Menu"
            >
              <Menu className="h-5 w-5 text-slate-700" />
              {!isDashboardPage && (
                <span className="hidden sm:inline text-xs font-bold text-slate-700 pr-1">Menu</span>
              )}
            </button>

            {/* Brand indicator on non-dashboard pages for easy context */}
            {!isDashboardPage && (
              <Link
                to="/dashboard"
                className="hidden md:flex items-center gap-2 pr-2 border-r border-slate-200"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f0533c] text-white">
                  <Inbox className="h-4 w-4 stroke-[2.2]" />
                </div>
                <span className="text-sm font-bold text-slate-900">{BRAND_NAME}</span>
              </Link>
            )}

            {/* Search Bar */}
            <div className="relative w-full max-w-xs sm:max-w-sm md:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks, rules, or drafts..."
                className="w-full rounded-full border border-slate-200 bg-white py-1.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#f0533c] focus:outline-none focus:ring-2 focus:ring-[#f0533c]/15"
              />
            </div>
          </div>

          {/* Right Navigation & User Controls */}
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Top Navigation Tabs */}
            <nav className="hidden sm:flex items-center gap-6 text-sm font-semibold">
              <Link
                to="/dashboard"
                className={`transition-colors pb-0.5 ${
                  pathname === "/dashboard" || pathname === "/dashboard/"
                    ? "border-b-2 border-[#f0533c] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hub
              </Link>
              <Link
                to="/chatbot"
                className={`transition-colors pb-0.5 ${
                  pathname.startsWith("/chatbot") ||
                  pathname.startsWith("/email-drafts") ||
                  pathname.startsWith("/automations")
                    ? "border-b-2 border-[#f0533c] text-slate-900 font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Services
              </Link>
              <Link
                to="/chatbot/kb"
                className="text-slate-600 hover:text-slate-900 transition-colors pb-0.5"
              >
                Docs
              </Link>
            </nav>

            {/* Icon buttons */}
            <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500">
              <Link
                to="/chatbot/leads"
                className="rounded-full p-2 hover:bg-slate-100 transition-colors text-slate-600 relative"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#f0533c]" />
              </Link>
              <Link
                to="/email-drafts"
                className="rounded-full p-2 hover:bg-slate-100 transition-colors text-slate-600"
                title="Email Drafts"
              >
                <Mail className="h-4 w-4" />
              </Link>
            </div>

            {/* User Profile Avatar */}
            <Link to="/settings" className="flex items-center gap-2 group" title="Account settings">
              {userAvatar ? (
                <img
                  src={userAvatar}
                  alt={fullName}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-slate-100 group-hover:ring-[#f0533c]/30 transition"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white group-hover:bg-[#f0533c] transition">
                  {fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </Link>
          </div>
        </header>

        {/* Optional Secondary Contextual Tab Header for deep subpages */}
        {activeModule && (
          <div className="border-b border-slate-200/70 bg-white/60 backdrop-blur-xs px-4 sm:px-8 py-2">
            <div className="flex items-center gap-2 overflow-x-auto text-xs font-semibold">
              <span className="text-slate-400 uppercase tracking-wider text-[10px] pr-2 border-r border-slate-200">
                {activeModule.prefix.replace("/", "").replace("-", " ")}
              </span>
              {activeModule.nav.map((item) => {
                const isSubActive = item.exact
                  ? pathname === item.to || pathname === item.to + "/"
                  : pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      isSubActive
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
