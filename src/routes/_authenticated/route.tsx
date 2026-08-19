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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

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

      {/* 1. Left Sidebar Panel (Persistent on desktop for all pages by default, collapsable via Hamburger) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r border-slate-800 bg-[#0f172a] px-4 py-6 transition-all duration-200 ease-in-out ${
          mobileOpen
            ? "translate-x-0 shadow-2xl"
            : "-translate-x-full " +
              (sidebarCollapsed ? "lg:-translate-x-full lg:fixed" : "lg:static lg:translate-x-0")
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
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
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
          <div className="flex items-center gap-3 sm:gap-4 flex-1 h-full min-w-0">
            {/* Hamburger Button: Shown on all screens, toggles collapse on desktop and opens drawer on mobile */}
            <button
              onClick={() => {
                if (typeof window !== "undefined" && window.innerWidth >= 1024) {
                  setSidebarCollapsed(!sidebarCollapsed);
                } else {
                  setMobileOpen(true);
                }
              }}
              className="flex items-center justify-center rounded-xl p-2.5 text-slate-700 hover:bg-slate-100 transition-all shrink-0 bg-slate-50 border border-slate-200 hover:border-slate-300 shadow-2xs"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              aria-label="Toggle Sidebar"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </button>

            {/* Injected Secondary Navbar (or Brand fallback when no subnav exists) */}
            {activeModule ? (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none h-full min-w-0">
                <span className="text-slate-400 uppercase tracking-widest text-[9px] font-extrabold mr-4 shrink-0 select-none pb-0.5">
                  {activeModule.prefix.replace("/", "").replace("-", " ")}
                </span>
                <div className="flex items-center gap-4 sm:gap-6 h-full">
                  {activeModule.nav.map((item) => {
                    const isSubActive = item.exact
                      ? pathname === item.to || pathname === item.to + "/"
                      : pathname === item.to || pathname.startsWith(item.to + "/");
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={`text-[10px] sm:text-xs font-bold transition-all border-b-2 h-16 flex items-center shrink-0 -mb-px ${
                          isSubActive
                            ? "border-[#f0533c] text-[#f0533c]"
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Link to="/dashboard" className="flex items-center gap-2 pr-2 shrink-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900">{BRAND_NAME}</span>
              </Link>
            )}
          </div>

          {/* Right Navigation & User Controls */}
          <div className="flex items-center gap-4 sm:gap-6">
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

            {/* User Profile Avatar Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 group focus:outline-none"
                title="User menu"
              >
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
              </button>

              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2.5 w-48 origin-top-right rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
                    <div className="px-3 py-2 border-b border-slate-100 text-left">
                      <p className="text-xs font-bold text-slate-900 truncate">{fullName}</p>
                      <p className="text-[10px] font-semibold text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-[#f0533c] transition-colors"
                      >
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span>View My Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors text-left"
                      >
                        <LogOut className="h-3.5 w-3.5 text-rose-400" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
