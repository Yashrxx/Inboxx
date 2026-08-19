import React from "react";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { ShieldCheck, Lock, Mail, Database, Eye } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export default function Privacy() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fafafc] text-slate-900">
      {/* Shared Common Navbar */}
      <PublicNavbar currentPage="privacy" />

      {/* Main Content Container */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs sm:p-10">
          {/* Header Title & Date */}
          <div className="border-b border-slate-200/80 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200/80 bg-orange-50 px-3.5 py-1 text-xs font-semibold text-[#f0533c]">
              <ShieldCheck className="h-3.5 w-3.5" /> Google OAuth Verification Compliant
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {BRAND_NAME} Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Last Updated: <span className="font-medium text-slate-900">August 10, 2026</span>
            </p>
          </div>

          {/* Policy Sections */}
          <div className="mt-8 space-y-8 text-sm leading-relaxed sm:text-base">
            {/* Overview */}
            <p className="text-slate-600">
              At {BRAND_NAME}, we take your privacy and data security seriously. This Privacy Policy
              outlines how we collect, access, use, and protect your information when you connect
              your Google Account and use our automated inbox assistance and AI drafting services.
            </p>

            {/* 1. Data Collection & Processing */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <Database className="h-5 w-5 text-[#f0533c]" />
                <h2>1. Data Collection &amp; Processing</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                {BRAND_NAME} accesses incoming user emails and attachments to execute
                user-configured automation rules, evaluate search keywords, trigger alerts, and
                display email threads in the Email Drafts interface for AI response generation.
                Email contents are passed to AI language models transiently solely to generate draft
                replies.
              </p>
            </section>

            {/* 2. Gmail API Scopes Usage */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <Eye className="h-5 w-5 text-[#f0533c]" />
                <h2>2. Gmail API Scopes Usage</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                To provide our automated indexing, AI drafting, and notification features,{" "}
                {BRAND_NAME} explicitly requests access to the following Google Gmail API scopes:
              </p>
              <ul className="mt-3 space-y-3 text-sm">
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold rounded bg-slate-200/80 px-2 py-0.5 text-slate-900 shrink-0 mt-0.5">
                    gmail.readonly
                  </span>
                  <span className="text-slate-600">
                    Used strictly to read notification subjects, message bodies, and parse attached
                    files for automated keyword matching and displaying email context in Email
                    Drafts.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="font-mono text-xs font-semibold rounded bg-slate-200/80 px-2 py-0.5 text-slate-900 shrink-0 mt-0.5">
                    gmail.modify / gmail.send
                  </span>
                  <span className="text-slate-600">
                    Used to apply user-configured labels, update email read states, and transmit
                    outgoing email replies explicitly initiated by the user via the &apos;Send
                    Reply&apos; action.
                  </span>
                </li>
              </ul>
            </section>

            {/* 3. Data Sharing & Storage */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <Lock className="h-5 w-5 text-[#f0533c]" />
                <h2>3. Data Sharing &amp; Storage</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                User email data is processed securely and is{" "}
                <strong className="text-slate-900 font-semibold">
                  NEVER sold, shared with third parties, or used for advertising or marketing
                  purposes
                </strong>
                . Attachment contents and email bodies are analyzed transiently in memory to
                evaluate rule conditions and generate AI draft suggestions, and are not retained
                permanently on our servers.
              </p>
            </section>

            {/* 4. Data Retention & Deletion */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <ShieldCheck className="h-5 w-5 text-[#f0533c]" />
                <h2>4. Data Retention &amp; Deletion</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                We store only essential log audit trails required for your dashboard activity
                history. Users can revoke {BRAND_NAME}&apos;s access at any time via their{" "}
                <a
                  href="https://myaccount.google.com/permissions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#f0533c] hover:underline font-medium"
                >
                  Google Account Permissions Settings
                </a>{" "}
                or by disconnecting their account directly in the {BRAND_NAME} dashboard. Upon
                disconnection, stored authorization tokens and associated settings are immediately
                deleted.
              </p>
            </section>

            {/* 5. Contact Info */}
            <section className="rounded-xl border border-orange-200/60 bg-orange-50/50 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <Mail className="h-5 w-5 text-[#f0533c]" />
                <h2>5. Contact &amp; Support</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                If you have any questions regarding this Privacy Policy or how your data is handled,
                please contact our support team at:
              </p>
              <div className="mt-3">
                <a
                  href="mailto:yashsushillunkad313@gmail.com"
                  className="inline-flex items-center gap-2 font-medium text-[#f0533c] hover:underline text-base"
                >
                  <Mail className="h-4 w-4" /> yashsushillunkad313@gmail.com
                </a>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Shared Footer */}
      <PublicFooter showCtaBanner={false} />
    </div>
  );
}
