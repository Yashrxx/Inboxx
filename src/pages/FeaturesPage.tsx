import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import {
  Bot,
  Mail,
  Zap,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  ShieldCheck,
  User,
  Star,
  Send,
  Database,
  Bell,
  Layers,
  Headphones,
  TrendingUp,
  Sparkles,
  Check,
} from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export default function FeaturesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Shared Common Navbar */}
      <PublicNavbar currentPage="services" />

      {/* 2. Three Main Feature Cards - White Background with Colorful Header Illustration Boxes */}
      <section className="py-16 sm:py-24 px-6 bg-slate-50/50">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900">
              Simply it helps to engage with customers &amp; grow business so fastly
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Everything you need to automate communication, generate qualified leads, and
              streamline inbox workflows.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {/* Card 1: Personalized Chatbot (Purple Header Box) */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300">
              {/* Visual Pastel Header Box */}
              <div className="h-44 w-full rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 p-6 flex items-center justify-center relative overflow-hidden shadow-xs">
                <div className="absolute top-2 left-2 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                <div className="flex flex-col items-center text-center text-white space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-md">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide uppercase text-indigo-100">
                    AI Chat Widget
                  </span>
                </div>
              </div>

              <div className="mt-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Personalized Chatbot</h3>
                  <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>Custom knowledge-base powered chatbot for your website.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>
                        Automatic lead capture, intent scoring, and conversation review logs.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>Multilingual responses tailored to your custom company voice.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f0533c] hover:underline"
                  >
                    Learn More <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 2: Email Draft Generation (Yellow Gold Header Box) */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300">
              {/* Visual Pastel Header Box */}
              <div className="h-44 w-full rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-6 flex items-center justify-center relative overflow-hidden shadow-xs">
                <div className="absolute bottom-2 right-2 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                <div className="flex flex-col items-center text-center text-white space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-md">
                    <Mail className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide uppercase text-amber-100">
                    Gmail Assistant
                  </span>
                </div>
              </div>

              <div className="mt-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Email Draft Generation</h3>
                  <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>Connect Gmail accounts with 1-click OAuth security.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>
                        Generate intelligent response drafts for 1-click review &amp; approval.
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>
                        Reference exact Knowledge Base pricing &amp; product specifications.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f0533c] hover:underline"
                  >
                    Learn More <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Card 3: Automations & Alerts (Peach / Coral Header Box) */}
            <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-300">
              {/* Visual Pastel Header Box */}
              <div className="h-44 w-full rounded-xl bg-gradient-to-br from-rose-400 to-[#f0533c] p-6 flex items-center justify-center relative overflow-hidden shadow-xs">
                <div className="absolute top-2 right-2 h-16 w-16 rounded-full bg-white/10 blur-xl" />
                <div className="flex flex-col items-center text-center text-white space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 shadow-md">
                    <Zap className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold tracking-wide uppercase text-rose-100">
                    Real-Time Alerts
                  </span>
                </div>
              </div>

              <div className="mt-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Automations &amp; Alerts</h3>
                  <ul className="mt-4 space-y-3 text-xs sm:text-sm text-slate-600">
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>Set custom email sync rules and automated keyword filters.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>Instant Telegram notifications when urgent inquiries arrive.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-[#f0533c] shrink-0 mt-0.5" />
                      <span>Full real-time audit logs and workspace activity tracking.</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#f0533c] hover:underline"
                  >
                    Learn More <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI Workflow Architecture & Functionality Highlight */}
      <section className="py-16 sm:py-20 px-6 bg-white border-t border-slate-100">
        <div className="mx-auto max-w-6xl grid gap-12 lg:grid-cols-2 items-center">
          {/* Left: Sleek AI Workflow Live Preview Widget (Light Theme with Slate Background) */}
          <div className="flex justify-center">
            <div className="w-full max-w-lg rounded-2xl bg-slate-200/90 text-slate-900 p-5 sm:p-6 shadow-xl border border-slate-300/90 space-y-4 relative overflow-hidden">
              {/* Subtle Brand Ambient Glow */}
              <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-[#f0533c]/10 blur-2xl pointer-events-none" />

              {/* Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-300/80">
                <div>
                  <span className="text-xs font-bold text-slate-900 tracking-tight">
                    Inboxx Engine
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Active Workspace
                </div>
              </div>

              {/* Step 1: Personalized Chatbot */}
              <div className="rounded-xl bg-white p-3.5 border border-slate-200/90 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-indigo-600" /> Personalized Chatbot
                  </span>
                  <span className="text-emerald-700 font-semibold text-[10px]">Live Widget</span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed">
                  &ldquo;Instant answers trained on your custom Knowledge Base &amp; website
                  docs.&rdquo;
                </p>
              </div>

              {/* Step 2: Email Draft Generation */}
              <div className="rounded-xl bg-white p-3.5 border border-slate-200/90 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-amber-600" /> Email Draft Generation
                  </span>
                  <span className="text-amber-800 font-mono font-semibold text-[10px]">
                    Gmail Synced
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg text-xs text-slate-800 border border-slate-200">
                  <span className="rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-amber-900">
                    Draft
                  </span>
                  <span className="truncate">Auto-generated reply ready for 1-click review</span>
                </div>
              </div>

              {/* Step 3: Automated Alerts */}
              <div className="rounded-xl bg-gradient-to-r from-orange-50/90 via-white to-white p-3.5 border border-[#f0533c]/30 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#f0533c] flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Automated Alerts
                  </span>
                  <span className="text-slate-500 font-medium text-[10px]">1.8s Response Time</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 border border-slate-200 text-slate-800 shadow-2xs font-medium">
                    <Mail className="h-3.5 w-3.5 text-[#f0533c]" /> Draft Created
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md bg-slate-50 px-2.5 py-1.5 border border-slate-200 text-slate-800 shadow-2xs font-medium">
                    <Send className="h-3.5 w-3.5 text-sky-600" /> Telegram Sent
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Functional Details */}
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
              From Customer Inquiries to Actionable Drafts in Seconds
            </h2>

            <ul className="space-y-3.5 text-xs sm:text-sm text-slate-700">
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[#f0533c] shrink-0 mt-0.5 font-bold">
                  ✓
                </div>
                <div>
                  <strong className="text-slate-900 block font-semibold">
                    Zero Hallucinations
                  </strong>
                  <span className="text-slate-600">
                    Answers are strictly bounded by your uploaded Knowledge Base documents.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[#f0533c] shrink-0 mt-0.5 font-bold">
                  ✓
                </div>
                <div>
                  <strong className="text-slate-900 block font-semibold">
                    1-Click Email Review
                  </strong>
                  <span className="text-slate-600">
                    Review, edit, and send generated Gmail drafts directly from your dashboard.
                  </span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-[#f0533c] shrink-0 mt-0.5 font-bold">
                  ✓
                </div>
                <div>
                  <strong className="text-slate-900 block font-semibold">
                    Instant Mobile Alerts
                  </strong>
                  <span className="text-slate-600">
                    Receive immediate Telegram notifications for high-priority sales leads.
                  </span>
                </div>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-[#f0533c] px-6 py-3 text-xs font-bold text-white transition hover:bg-[#d9442e] shadow-sm"
              >
                <span>Launch Your AI Agent</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. "Get Started with Templates" Dark Grid Section from Template */}
      <section className="bg-[#0b132b] text-white py-16 sm:py-24 px-6 border-t border-slate-800">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
              Get started with pre-built solutions
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              Activate your AI chatbots and inbox rules with ready-to-use workflows in under two
              minutes.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-4">
            {/* Tile 1 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <Bot className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Customer Support Chatbot</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Answers repetitive visitor FAQs instantly from your Knowledge Base.
              </p>
            </div>

            {/* Tile 2 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <Mail className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">AI Email Draft Generator</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Creates contextual draft replies in Gmail for human approval.
              </p>
            </div>

            {/* Tile 3 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Lead Scoring &amp; Capture</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Captures contact details and scores buyer intent automatically.
              </p>
            </div>

            {/* Tile 4 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Telegram Escalations</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Pushes urgent inquiries directly to your mobile phone in 2 seconds.
              </p>
            </div>

            {/* Tile 5 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <Database className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Knowledge Base Sync</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Ingests PDFs, doc files, and text notes into structured vector memory.
              </p>
            </div>

            {/* Tile 6 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">OAuth Security Guard</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Official Google token authentication with zero local password storage.
              </p>
            </div>

            {/* Tile 7 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Multi-Rule Automation</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Trigger actions based on key terms like &ldquo;Pricing&rdquo; or
                &ldquo;Quote&rdquo;.
              </p>
            </div>

            {/* Tile 8 */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-5 transition hover:border-orange-500/50 hover:bg-slate-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-[#f0533c]">
                <Bell className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold text-white">Real-Time Audit Logs</h3>
              <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                Full activity tracking for every email processed and message sent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Testimonials Section from Template ("See how Inboxx Assistant helps others") */}
      <section className="py-16 sm:py-24 px-6 bg-slate-50/70 border-t border-slate-200/80">
        <div className="mx-auto max-w-6xl">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              See how {BRAND_NAME} helps others
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Trusted by support teams and business owners to automate daily customer communication.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {/* Review 1 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  &ldquo;With {BRAND_NAME}&apos;s AI draft generator, our support team saves over 15
                  hours every single week. Generating accurate replies referencing our specs in one
                  click is a game changer.&rdquo;
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-[#f0533c] font-bold text-xs">
                  AP
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Arya Pal</h3>
                  <p className="text-[11px] text-slate-500">Software Developer &amp; Tech Lead</p>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic">
                  &ldquo;The Telegram notification integration alerts us the exact moment a
                  high-value enterprise lead requests a quote. Our response time dropped from 4
                  hours to 2 minutes.&rdquo;
                </p>
              </div>
              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-slate-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white font-bold text-xs">
                  SB
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Shivam Bhansali</h3>
                  <p className="text-[11px] text-slate-500">AI &amp; ML Engineer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Integrations Bar from Template */}
      <section className="py-12 px-6 bg-white border-t border-slate-200/80">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Works seamlessly with modern workspace platforms
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-80">
            <div className="flex items-center gap-2 font-bold text-slate-700 text-xs sm:text-sm">
              <Mail className="h-4 w-4 text-[#f0533c]" /> Gmail &amp; Workspace
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-700 text-xs sm:text-sm">
              <Send className="h-4 w-4 text-sky-500" /> Telegram Messenger
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-700 text-xs sm:text-sm">
              <Database className="h-4 w-4 text-emerald-600" /> Supabase Storage
            </div>
            <div className="flex items-center gap-2 font-bold text-slate-700 text-xs sm:text-sm">
              <Bot className="h-4 w-4 text-purple-600" /> Custom Web Widget
            </div>
          </div>
        </div>
      </section>

      {/* Shared Footer */}
      <PublicFooter showCtaBanner={false} />
    </div>
  );
}
