/**
 * /signup — Exact replica of user reference image, compact one-frame layout
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/lib/brand";
import { SIGNUP_HERO_IMG } from "@/lib/assets";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: `Create your account — ${BRAND_NAME}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

const INDUSTRIES = [
  { value: "manufacturing", label: "Manufacturing & Industrial Equipment" },
  { value: "wholesale", label: "Wholesale & Distribution" },
  { value: "coldmail", label: "Job Seeker / Student (Cold Outreach)" },
  { value: "other", label: "Other" },
];

const SIZES = ["Just me", "2-10", "11-50", "51-200", "200+"];

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard",
          data: {
            full_name: fullName,
            company_name: companyName,
            industry,
            company_size: companySize,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        toast.success("Welcome! Your account is ready.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const m = "Account created. Check your email to confirm, then sign in.";
        setMsg(m);
        toast.success(m);
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Sign up failed.";
      setMsg(m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-screen w-full bg-[#f8f9fa] bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] flex flex-col justify-between font-sans overflow-hidden p-3 sm:p-4">
      {/* Center Section */}
      <div className="flex-1 flex items-center justify-center my-auto min-h-0">
        {/* Compact Floating Card */}
        <div className="w-full max-w-3xl lg:max-w-4xl rounded-2xl sm:rounded-[24px] bg-white shadow-xl border border-slate-200/80 overflow-hidden grid lg:grid-cols-2">
          {/* Left Panel: Photo & Overlay Text */}
          <div className="relative bg-slate-900 overflow-hidden min-h-[180px] lg:min-h-[480px] flex flex-col justify-end p-6 sm:p-8">
            <img
              src={SIGNUP_HERO_IMG}
              alt="Team collaborating in office"
              className="absolute inset-0 z-0 w-full h-full object-cover opacity-80"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

            {/* Bottom Content Overlay */}
            <div className="relative z-10 text-white">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                Join the future of automation.
              </h2>
              <p className="mt-1.5 text-xs text-slate-200 leading-relaxed max-w-xs">
                Create your business account today and launch your custom AI assistant in minutes.
              </p>
            </div>
          </div>

          {/* Right Panel: Sign Up Form */}
          <div className="p-6 sm:p-7 md:p-8 flex flex-col justify-between bg-white">
            <div>
              {/* Header Branding */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#f0533c] stroke-[2.2]" />
                  <span className="text-lg font-bold tracking-tight text-slate-900">
                    {BRAND_NAME}
                  </span>
                </div>
                <Link
                  to="/"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#f0533c] transition px-2.5 py-1 rounded-md bg-slate-100/80 hover:bg-slate-100 border border-slate-200/60"
                >
                  <ArrowLeft className="h-3.5 w-3.5 text-[#f0533c]" />
                  <span>Home</span>
                </Link>
              </div>

              {/* Heading */}
              <div className="mt-3">
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
                  Create your account
                </h1>
              </div>

              {/* Sign Up Form */}
              <form onSubmit={submit} className="mt-3.5 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Full Name
                    </label>
                    <input
                      required
                      maxLength={120}
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Business Email
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={255}
                      placeholder="john@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      maxLength={72}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-9 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Company / Organization Name
                  </label>
                  <input
                    required
                    maxLength={200}
                    placeholder="Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Industry
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                    >
                      <option value="">— Select —</option>
                      {INDUSTRIES.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1">
                      Employees (Optional)
                    </label>
                    <select
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                    >
                      <option value="">— Select —</option>
                      {SIZES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {msg && (
                  <div className="rounded-lg bg-slate-100 p-2 text-xs text-slate-800 border border-slate-200 font-medium">
                    {msg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-[#f0533c] hover:bg-[#d9442e] text-white font-semibold py-2.5 px-4 text-xs shadow-xs transition disabled:opacity-50 mt-2"
                >
                  {busy ? "Creating account…" : "Create account"}
                </button>
              </form>
            </div>

            {/* Bottom Login Link */}
            <div className="mt-3 pt-1 text-center text-xs text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-[#f0533c] hover:underline">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/60 py-2.5 px-6 backdrop-blur-xs shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#f0533c] sm:text-slate-500 gap-2">
          <div className="text-[#f0533c]">
            © {new Date().getFullYear()} Inboxx Assistant. All rights reserved.
          </div>
          <div className="flex items-center gap-5 text-slate-500">
            <Link to="/privacy" className="hover:text-slate-900 transition">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-slate-900 transition">
              Terms of Service
            </Link>
            <a
              href="mailto:support@inboxxassistant.com"
              className="hover:text-slate-900 transition"
            >
              Support
            </a>
            <a
              href="mailto:support@inboxxassistant.com"
              className="hover:text-slate-900 transition"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
