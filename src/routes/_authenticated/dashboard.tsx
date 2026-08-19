/**
 * Dashboard / Hub — Main overview matching the design image.
 * Displays "Your Active Services", "Service Live Status & Activity", and "Performance Overview".
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  TrendingUp,
  MessageSquare,
  FileEdit,
  Zap,
  Users,
  PieChart,
  FileCheck,
  ArrowUpRight,
  Radio,
  Activity,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bot,
  Mail,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { BRAND_NAME } from "@/lib/brand";
import { HOME_HERO_IMG } from "@/lib/assets";
import { DashboardKnowledgeBase } from "@/components/DashboardKnowledgeBase";
import { getDashboardLiveStats } from "@/lib/workspace.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: `Dashboard — ${BRAND_NAME}` },
      {
        name: "description",
        content: "Overview of your active AI services, live activity monitor, and automations.",
      },
    ],
  }),
  component: DashboardPage,
});

type ServiceKey = "chatbot" | "email" | "automations";

interface ServiceLiveInfo {
  id: ServiceKey;
  name: string;
  badge: string;
  icon: typeof MessageSquare;
  color: string;
  channel: string;
  route: string;
  statusText: string;
  metrics: { label: string; value: string; copyValue?: string; isCopyable?: boolean }[];
  recentEvents: { time: string; text: string; type: "chat" | "lead" | "sync" | "alert" }[];
}

function DashboardPage() {
  const [activeServiceKey, setActiveServiceKey] = useState<ServiceKey>("chatbot");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchLiveStats = useServerFn(getDashboardLiveStats);
  const { data: stats } = useQuery({
    queryKey: ["dashboard-live-stats"],
    queryFn: () => fetchLiveStats(),
    refetchInterval: 10000,
  });

  const chatbotIsLive = stats ? stats.chatbot.status === "live" : false;
  const emailIsLive = true; // hardcoded live for now per requirement
  const automationsIsLive = stats ? stats.automations.status === "live" : false;

  const liveServicesData: Record<
    ServiceKey,
    {
      id: ServiceKey;
      name: string;
      isLive: boolean;
      icon: typeof MessageSquare;
      color: string;
      channel: string;
      route: string;
      metrics: { label: string; value: string; copyValue?: string; isCopyable?: boolean }[];
    }
  > = {
    chatbot: {
      id: "chatbot",
      name: "Personalized Chatbot Widget",
      isLive: chatbotIsLive,
      icon: MessageSquare,
      color: "#f0533c",
      channel: "Public Web Widget + Gemini 2.5 Flash RAG",
      route: "/chatbot/live",
      metrics: [
        {
          label: "Active Channel",
          value:
            "https://ais-dev-3tq53ekcbmlvn35cecpuc4-136437071621.asia-southeast1.run.app/?workspace_id=523216d7-9b50-471d-b720-39922e0eddf6",
          copyValue:
            "https://ais-dev-3tq53ekcbmlvn35cecpuc4-136437071621.asia-southeast1.run.app/?workspace_id=523216d7-9b50-471d-b720-39922e0eddf6",
          isCopyable: true,
        },
        { label: "Avg Latency", value: "1.1s" },
        {
          label: "Today's Inquiries",
          value: `${stats?.chatbot?.inquiriesToday ?? 0} Inquiries`,
        },
        {
          label: "Qualified Leads",
          value: `${stats?.chatbot?.qualifiedLeads ?? 0} Qualified`,
        },
      ],
    },
    email: {
      id: "email",
      name: "AI Email Draft Studio",
      isLive: emailIsLive,
      icon: FileEdit,
      color: "#3b82f6",
      channel: "Gmail Workspace Sync & Custom KB Rules",
      route: "/email-drafts",
      metrics: [
        {
          label: "Connected Inbox",
          value: stats?.email?.connectedEmail || "Gmail OAuth 2.0",
        },
        { label: "Draft Generation", value: "Inboxx Engine" },
        { label: "Drafts Created Today", value: "2" },
        { label: "Acceptance Rate", value: "94%" },
      ],
    },
    automations: {
      id: "automations",
      name: "Automations & Telegram Alerts",
      isLive: automationsIsLive,
      icon: Zap,
      color: "#9333ea",
      channel: "Telegram Bot Dispatcher + Webhook Filters",
      route: "/automations",
      metrics: [
        {
          label: "Active Rules",
          value: `${stats?.automations?.activeRulesCount ?? 0} Active ${(stats?.automations?.activeRulesCount ?? 0) === 1 ? "Rule" : "Rules"}`,
        },
        { label: "Alert Channel", value: "Inboxx AI Alert" },
        {
          label: "Alerts Dispatched",
          value: `${stats?.automations?.alertsDispatchedToday ?? 0} Today`,
        },
        { label: "Uptime", value: "99.98%" },
      ],
    },
  };

  const currentService = liveServicesData[activeServiceKey];

  const copyToClipboard = (text: string, key: string, label: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard`);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  return (
    <div className="relative min-h-full bg-[#f3f4f5] -m-4 sm:-m-8 lg:-m-10 p-4 sm:p-8 lg:p-10">
      {/* Light Laptop Hero Background Layer */}
      <div className="pointer-events-none absolute inset-0 -top-8 -mx-4 sm:-mx-8 z-0 overflow-hidden">
        <img
          src={HOME_HERO_IMG}
          alt=""
          className="h-full w-full object-cover object-right-top opacity-[0.09] sm:opacity-[0.12] blur-[0.4px] select-none"
        />
        {/* Soft atmospheric gradient wash ensuring crystal-clear readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#f3f4f5]/50 via-[#f3f4f5]/85 to-[#f3f4f5]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl space-y-10">
        {/* 1. Header */}
        <div className="pb-2 border-b border-slate-200/80">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Your Active Services
          </h1>
        </div>

        {/* 2. Your Active Services Section */}
        <section className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Service Card 1: Personalized Chatbot */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
              <div>
                {/* Icon badge */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-[#f0533c]">
                  <MessageSquare className="h-5 w-5 stroke-[2.2]" />
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
                  Personalized Chatbot
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Knowledge-base powered chatbot widget with automated lead scoring.
                </p>
              </div>

              <div className="mt-8">
                <Link
                  to="/chatbot"
                  className="block w-full rounded-xl border border-slate-900 bg-white py-3 text-center text-sm font-bold text-slate-900 shadow-xs transition-colors hover:border-[#f0533c] active:scale-[0.98]"
                >
                  Launch Chatbot
                </Link>
              </div>
            </div>

            {/* Service Card 2: Email Draft Generation */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
              <div>
                {/* Icon badge */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500">
                  <FileEdit className="h-5 w-5 stroke-[2.2]" />
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">
                  Draft Generation
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  AI draft generation using connected Gmail accounts and custom knowledge bases.
                </p>
              </div>

              <div className="mt-8">
                <Link
                  to="/email-drafts"
                  className="block w-full rounded-xl border border-slate-900 bg-white py-3 text-center text-sm font-bold text-slate-900 shadow-xs transition-colors hover:border-[#f0533c] active:scale-[0.98]"
                >
                  Generate Draft
                </Link>
              </div>
            </div>

            {/* Service Card 3: Automations & Alerts */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-7 shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
              <div>
                {/* Icon badge */}
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <Zap className="h-5 w-5 stroke-[2.2]" />
                </div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-slate-900">Alerts</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Custom email sync rules, keyword filters, and real-time Telegram notifications.
                </p>
              </div>

              <div className="mt-8">
                <Link
                  to="/automations"
                  className="block w-full rounded-xl border border-slate-900 bg-white py-3 text-center text-sm font-bold text-slate-900 shadow-xs transition-colors hover:border-[#f0533c] active:scale-[0.98]"
                >
                  Manage Rules
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Knowledge Base Section matching design (User-shared files only) */}
        <DashboardKnowledgeBase />

        {/* 3. Service Live Section (Currently in Use) */}
        <section className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Service Live Monitor
              </h2>
            </div>

            {/* Service Selectors */}
            <div className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-slate-100 p-1">
              {(["chatbot", "email", "automations"] as ServiceKey[]).map((key) => {
                const s = liveServicesData[key];
                const isSelected = activeServiceKey === key;
                return (
                  <button
                    key={key}
                    onClick={() => setActiveServiceKey(key)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                      isSelected
                        ? "bg-white text-slate-900 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        s.isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                      }`}
                    />
                    <span>
                      {key === "chatbot"
                        ? "Chatbot"
                        : key === "email"
                          ? "Email Drafts"
                          : "Automations"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Service Detailed Activity Card */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white shadow-2xs"
                    style={{ backgroundColor: currentService.color }}
                  >
                    <currentService.icon className="h-4 w-4 stroke-[2.2]" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {currentService.name}
                  </h3>
                </div>

                <p className="mt-1.5 text-xs font-medium text-slate-400">
                  Channel:{" "}
                  <span className="text-slate-600 font-semibold">{currentService.channel}</span>
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      currentService.isLive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        currentService.isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                      }`}
                    />
                    Service Status: {currentService.isLive ? "Live" : "Down"}
                  </span>
                </div>
              </div>

              <div className="shrink-0">
                <Link
                  to={currentService.route}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs transition hover:bg-[#f0533c]"
                >
                  <span>Launch Live Terminal</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Telemetry Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              {currentService.metrics.map((m, idx) => (
                <div
                  key={idx}
                  className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 flex flex-col justify-between"
                >
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                    {m.label}
                  </span>
                  {m.isCopyable ? (
                    <div className="mt-1 flex items-center justify-between gap-1.5 min-w-0 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs">
                      <span
                        className="text-xs font-mono font-semibold text-slate-900 truncate"
                        title={m.copyValue || m.value}
                      >
                        {m.value}
                      </span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            m.copyValue || m.value,
                            `${activeServiceKey}-${idx}`,
                            m.label,
                          )
                        }
                        type="button"
                        title="Copy link to clipboard"
                        className="shrink-0 p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                      >
                        {copiedKey === `${activeServiceKey}-${idx}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm sm:text-base font-bold text-slate-900 truncate">
                      {m.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. Performance Overview Section */}
        <section className="space-y-4 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="text-[#f0533c]">
              <TrendingUp className="h-5 w-5 stroke-[2.2]" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Performance Overview
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 items-stretch">
            {/* Card 1: Total Inquiries */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Total Inquiries</span>
                <Users className="h-4 w-4 text-slate-700" />
              </div>

              <div className="my-4">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">1,248</span>
              </div>

              <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span>+12% from last week</span>
              </div>
            </div>

            {/* Card 2: Lead Score Distribution */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-slate-600">
                  Lead Score Distribution
                </span>
                <PieChart className="h-4 w-4 text-slate-700" />
              </div>

              <div className="my-2 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  {/* Stacked Segment Bar */}
                  <div className="flex flex-1 overflow-hidden rounded-lg">
                    <div className="flex h-10 flex-[5] items-center justify-center bg-[#f0533c] text-xs font-bold text-white">
                      50%
                    </div>
                    <div className="flex h-10 flex-[3] items-center justify-center bg-[#f8b16e] text-xs font-bold text-slate-900">
                      30%
                    </div>
                    <div className="flex h-10 flex-[2] items-center justify-center bg-[#d5dbe2] text-xs font-bold text-slate-800">
                      20%
                    </div>
                  </div>

                  {/* Legend list */}
                  <div className="flex flex-col gap-1.5 text-[11px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#f0533c]" />
                      <span>Hot</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#f8b16e]" />
                      <span>Warm</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-[#d5dbe2]" />
                      <span>Cold</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs font-medium text-slate-400">
                Active lead qualification metric
              </div>
            </div>

            {/* Card 3: Email Efficiency */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Email Efficiency</span>
                <FileCheck className="h-4 w-4 text-slate-700" />
              </div>

              <div className="my-4">
                <span className="text-4xl font-extrabold tracking-tight text-slate-900">94%</span>
              </div>

              <div className="text-xs font-semibold text-emerald-600">
                Drafts accepted without edits
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
