import React from "react";
import PublicNavbar from "@/components/PublicNavbar";
import PublicFooter from "@/components/PublicFooter";
import { FileText, CheckCircle2, Bot, UserCheck, AlertTriangle, LogOut, Mail } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export default function Terms() {
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
              <FileText className="h-3.5 w-3.5" /> Terms of Service Agreement
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {BRAND_NAME} Terms of Service
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Last Updated: <span className="font-medium text-slate-900">August 10, 2026</span>
            </p>
          </div>

          {/* Terms Sections */}
          <div className="mt-8 space-y-8 text-sm leading-relaxed sm:text-base">
            <p className="text-slate-600">
              Welcome to {BRAND_NAME}. These Terms of Service govern your use of our automated
              notification, email processing, and AI drafting platform. By using our application,
              you accept and agree to comply with these terms.
            </p>

            {/* 1. Acceptance of Terms */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <CheckCircle2 className="h-5 w-5 text-[#f0533c]" />
                <h2>1. Acceptance of Terms</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                By connecting your Google Account to {BRAND_NAME}, you agree to allow {BRAND_NAME}{" "}
                to process incoming emails and relevant attachments according to your configured
                automation rules. If you do not agree to these terms, you should not connect your
                account or use the service.
              </p>
            </section>

            {/* 2. AI Response Generation & Email Transmission */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <Bot className="h-5 w-5 text-[#f0533c]" />
                <h2>2. AI Response Generation &amp; Email Transmission</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                {BRAND_NAME} includes features that utilize artificial intelligence to analyze
                incoming emails and suggest draft replies. You acknowledge and agree that:
              </p>
              <ol className="mt-3 space-y-2 text-sm text-slate-600 list-decimal list-inside">
                <li className="pl-1">
                  <strong className="text-slate-900 font-medium">Suggestions Only:</strong>{" "}
                  AI-generated drafts are provided as suggestions only. You are solely responsible
                  for reviewing, editing, and verifying the accuracy of any AI draft before sending.
                </li>
                <li className="pl-1">
                  <strong className="text-slate-900 font-medium">User-Initiated Sending:</strong>{" "}
                  Emails are transmitted only when you explicitly click the &apos;Send Reply&apos;
                  button. {BRAND_NAME} does not automatically send outgoing emails without direct
                  user action.
                </li>
              </ol>
            </section>

            {/* 3. User Responsibilities */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <UserCheck className="h-5 w-5 text-[#f0533c]" />
                <h2>3. User Responsibilities</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Users are solely responsible for configuring accurate keywords, rule conditions,
                sender filters, and notification preferences, as well as reviewing all outgoing
                communication generated via the AI Drafts interface prior to sending.
              </p>
            </section>

            {/* 4. Disclaimer of Liability */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <AlertTriangle className="h-5 w-5 text-[#f0533c]" />
                <h2>4. Disclaimer of Liability</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                {BRAND_NAME} provides notification assistance on an &quot;as-is&quot; and
                &quot;as-available&quot; basis without warranties of any kind. {BRAND_NAME} is not
                responsible for missed messages, delivery delays, network outages, or third-party
                service interruptions. Automated alerts serve as a convenience tool and should not
                be relied upon as the sole source of critical communications.
              </p>
            </section>

            {/* 5. Termination */}
            <section className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <LogOut className="h-5 w-5 text-[#f0533c]" />
                <h2>5. Termination</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                Users may terminate their account and stop all automated email processing at any
                time by revoking OAuth permissions through Google Account Security settings or by
                disconnecting their account in the {BRAND_NAME} dashboard settings. We reserve the
                right to suspend or terminate service access for violations of these terms or misuse
                of the platform.
              </p>
            </section>

            {/* 6. Contact & Support */}
            <section className="rounded-xl border border-orange-200/60 bg-orange-50/50 p-5 sm:p-6">
              <div className="flex items-center gap-3 text-lg font-semibold text-slate-900">
                <Mail className="h-5 w-5 text-[#f0533c]" />
                <h2>6. Contact &amp; Support</h2>
              </div>
              <p className="mt-3 text-slate-600 text-sm sm:text-base">
                If you have any questions regarding these Terms of Service, please contact us at:
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
      <PublicFooter showCtaBanner={true} />
    </div>
  );
}
