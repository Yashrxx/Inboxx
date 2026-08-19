/**
 * /login — Compact one-frame login page with no scrollbar
 */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND_NAME } from "@/lib/brand";
import { LOGIN_HERO_IMG } from "@/lib/assets";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: `Sign in — ${BRAND_NAME}` }, { name: "robots", content: "noindex" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Already signed in → dashboard
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled && data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) navigate({ to: "/dashboard", replace: true });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      toast.success("Signed in successfully.");
    } catch (err) {
      const m = err instanceof Error ? err.message : "Sign in failed.";
      setMsg(m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) {
        setMsg(error.message);
        toast.error(error.message);
        setBusy(false);
      }
    } catch (err) {
      const m = err instanceof Error ? err.message : "Google sign-in failed.";
      setMsg(m);
      toast.error(m);
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!email) {
      const m = "Enter your email above first, then click 'Forgot Password?'.";
      setMsg(m);
      toast.error(m);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) throw error;
      const m = "Check your email for the password reset link.";
      setInfo(m);
      toast.success(m);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Could not send reset email.";
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
          <div className="relative bg-slate-900 overflow-hidden min-h-[180px] lg:min-h-[440px] flex flex-col justify-end p-6 sm:p-8">
            <img
              src={LOGIN_HERO_IMG}
              alt="Office team working"
              className="absolute inset-0 z-0 w-full h-full object-cover opacity-80"
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

            {/* Bottom Content Overlay */}
            <div className="relative z-10 text-white">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                Welcome back.
              </h2>
              <p className="mt-1.5 text-xs text-slate-200 leading-relaxed max-w-xs">
                Access your AI assistant dashboard and continue automating your conversations.
              </p>
            </div>
          </div>

          {/* Right Panel: Sign In Form */}
          <div className="p-6 sm:p-8 md:p-9 flex flex-col justify-between bg-white">
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
              <div className="mt-4">
                <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Sign In</h1>
                <p className="mt-1 text-xs text-slate-500">
                  Enter your details to access your account.
                </p>
              </div>

              {/* Sign In Form */}
              <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                  />
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
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 pr-10 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#f0533c] focus:ring-2 focus:ring-[#f0533c]/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 transition"
                    >
                      {showPassword ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Options Row: Remember me + Forgot password */}
                <div className="flex items-center justify-between text-xs font-medium pt-0.5">
                  <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#f0533c] focus:ring-[#f0533c]"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={forgotPassword}
                    className="text-[#f0533c] hover:underline transition"
                  >
                    Forgot Password?
                  </button>
                </div>

                {msg && (
                  <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-100 font-medium">
                    {msg}
                  </div>
                )}

                {info && (
                  <div className="rounded-lg bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-100 font-medium">
                    {info}
                  </div>
                )}

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-[#f0533c] hover:bg-[#d9442e] text-white font-semibold py-2.5 px-4 text-xs shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 mt-1"
                >
                  {busy ? (
                    "Signing in…"
                  ) : (
                    <>
                      Sign In <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>

                {/* Optional Google Sign-In */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={googleSignIn}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Or sign in with Google</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Bottom Signup Link */}
            <div className="mt-4 pt-2 text-center text-xs text-slate-600">
              Don&apos;t have an account?{" "}
              <Link to="/signup" className="font-semibold text-[#f0533c] hover:underline">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <footer className="w-full border-t border-slate-200/80 bg-white/60 py-2.5 px-6 backdrop-blur-xs shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
          <div>© {new Date().getFullYear()} Inboxx Assistant. All rights reserved.</div>
          <div className="flex items-center gap-5">
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
              Contact Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
