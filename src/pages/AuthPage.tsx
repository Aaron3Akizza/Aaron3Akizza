import { FormEvent, useState } from "react";
import { ArrowRight, Building2, Eye, EyeOff, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";
import { useLocation, useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Map raw Supabase errors to friendly messages ─────────────────────────────
function humanizeError(message: string): { text: string; isUnverified: boolean } {
  const lower = message.toLowerCase();

  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials"))
    return { text: "The email or password is incorrect. Please check and try again.", isUnverified: false };

  if (lower.includes("email not confirmed") || lower.includes("not confirmed"))
    return {
      text: "Your email address hasn't been verified yet. Check your inbox — and your Spam/Junk folder.",
      isUnverified: true,
    };

  if (lower.includes("user already registered") || lower.includes("already registered"))
    return { text: "An account with this email already exists. Try logging in instead.", isUnverified: false };

  if (lower.includes("too many requests") || lower.includes("rate limit"))
    return { text: "Too many attempts. Please wait a few minutes before trying again.", isUnverified: false };

  if (lower.includes("user not found"))
    return { text: "No account found with that email address. Please check or register.", isUnverified: false };

  if (lower.includes("network") || lower.includes("fetch"))
    return { text: "Network error. Check your internet connection and try again.", isUnverified: false };

  return { text: message, isUnverified: false };
}

// ─── Shared layout shell ──────────────────────────────────────────────────────
function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">BizFlow</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 via-green-400 to-emerald-500" />
          <div className="p-8">
            {children}
          </div>
        </div>
        {footer && <p className="text-center text-sm text-gray-500 mt-5">{footer}</p>}
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string; [key: string]: string | boolean | ((event: React.ChangeEvent<HTMLInputElement>) => void) }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span>
      <input
        className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:opacity-50"
        {...props}
      />
    </label>
  );
}

function SubmitButton({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2.5 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full mt-1"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Please wait…
        </>
      ) : children}
    </button>
  );
}

// ─── Inline forgot password panel ────────────────────────────────────────────
function ForgotPasswordPanel({ onClose }: { onClose: () => void }) {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!supabase) { setError("Supabase is not configured."); return; }
    setLoading(true);
    // Redirect to /auth/callback?type=recovery so AuthCallbackPage can detect it
    const { error: err } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: `${window.location.origin}/auth/callback?type=recovery` }
    );
    setLoading(false);
    if (err) { setError(err.message || "Failed to send reset email."); return; }
    setSent(true);
  };

  return (
    <div className="bg-gray-50 border border-green-200 rounded-xl p-4">
      {sent ? (
        <div>
          <p className="font-semibold text-gray-900 text-sm mb-1">Reset email sent!</p>
          <p className="text-gray-600 text-xs leading-relaxed mb-1">
            Check your inbox for a password reset link. Also check your{" "}
            <strong>Spam / Junk</strong> folder if you don't see it.
          </p>
          <p className="text-gray-400 text-xs">The link expires in 1 hour.</p>
        </div>
      ) : (
        <form onSubmit={send} noValidate>
          <div className="flex items-center justify-between mb-2.5">
            <p className="font-semibold text-gray-900 text-sm">Reset your password</p>
            <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-gray-700">
              Cancel
            </button>
          </div>
          <p className="text-gray-500 text-xs mb-3">
            Enter the email you registered with and we'll send a reset link.
          </p>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@shop.com"
              required
              disabled={loading}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-green-600 text-white px-3.5 py-2 text-xs font-medium hover:bg-green-700 disabled:opacity-50 shrink-0"
            >
              {loading ? "…" : "Send"}
            </button>
          </div>
          {error && <p className="text-red-600 text-xs mt-2">⚠ {error}</p>}
        </form>
      )}
    </div>
  );
}

// ─── Main AuthPage ────────────────────────────────────────────────────────────
export function AuthPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDemo, configured } = useAuth();

  const isSignup = params.get("mode") === "signup" || location.pathname === "/signup";
  const isReset  = params.get("mode") === "reset";
  const isUpdate = params.get("mode") === "update-password";

  const [showPassword, setShowPassword]   = useState(false);
  const [form,         setForm]           = useState({ name: "", phone: "", email: "", password: "" });
  const [error,        setError]          = useState("");
  const [isUnverified, setIsUnverified]   = useState(false);
  const [message,      setMessage]        = useState("");
  const [loading,      setLoading]        = useState(false);
  const [showForgot,   setShowForgot]     = useState(false);

  // ── Demo mode ──────────────────────────────────────────────────────────────
  if (isDemo) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">BizFlow Demo</h1>
          <p className="text-sm text-gray-500 mb-6 leading-relaxed">
            No account needed in demo mode — click below to explore the full
            system with sample data.
          </p>
          <button
            onClick={() => navigate("/app", { replace: true })}
            className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white px-4 py-3 text-sm font-semibold hover:bg-green-700"
          >
            Enter demo <ArrowRight size={16} />
          </button>
          <p className="text-xs text-gray-400 mt-5">
            To go live, add your{" "}
            <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="bg-gray-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code>{" "}
            to the <code className="bg-gray-100 px-1 rounded">.env</code> file.
          </p>
        </div>
      </AuthShell>
    );
  }

  // ── Password reset request ─────────────────────────────────────────────────
  if (isReset) {
    return (
      <AuthShell footer={
        <button onClick={() => navigate("/login")} className="text-green-600 font-medium hover:underline">
          Back to login
        </button>
      }>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email and we'll send a reset link. Check Spam/Junk if you don't see it.
        </p>
        {error   && <div role="alert"  className="mb-4 rounded-lg bg-red-50   border border-red-200   px-3.5 py-2.5 text-sm text-red-600  ">{error}</div>}
        {message && <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3.5 py-2.5 text-sm text-green-700">{message}</div>}
        <form className="flex flex-col gap-4" onSubmit={async (e) => {
          e.preventDefault();
          setError(""); setMessage("");
          if (!supabase) { setError("Supabase is not configured."); return; }
          if (!form.email.trim()) { setError("Please enter your email address."); return; }
          setLoading(true);
          const { error: err } = await supabase.auth.resetPasswordForEmail(
            form.email.trim().toLowerCase(),
            { redirectTo: `${window.location.origin}/auth/callback?type=recovery` }
          );
          setLoading(false);
          if (err) { setError("Could not send reset email. Check the address and try again."); return; }
          setMessage("Reset link sent! Check your inbox and Spam/Junk folder.");
        }}>
          <Field label="Email" type="email" placeholder="you@shop.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  // ── Set new password (after clicking reset link) ───────────────────────────
  if (isUpdate) {
    return (
      <AuthShell>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Set new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a new password for your account.</p>
        {error   && <div role="alert"  className="mb-4 rounded-lg bg-red-50   border border-red-200   px-3.5 py-2.5 text-sm text-red-600  ">{error}</div>}
        {message && <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-3.5 py-2.5 text-sm text-green-700">{message}</div>}
        <form className="flex flex-col gap-4" onSubmit={async (e) => {
          e.preventDefault();
          setError(""); setMessage("");
          if (!supabase) return;
          if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
          setLoading(true);
          const { error: err } = await supabase.auth.updateUser({ password: form.password });
          setLoading(false);
          if (err) { setError("Could not update password. The link may have expired — request a new one."); return; }
          setMessage("Password updated! Taking you to the app…");
          setTimeout(() => navigate("/app", { replace: true }), 1500);
        }}>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">New password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-green-600"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <SubmitButton loading={loading}>
            Set new password <ArrowRight size={16} />
          </SubmitButton>
        </form>
      </AuthShell>
    );
  }

  // ── Login / Signup ─────────────────────────────────────────────────────────
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsUnverified(false);
    setShowForgot(false);

    if (!configured || !supabase) {
      setError("BizFlow is not connected to the database. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.");
      return;
    }
    if (form.password.length < 8) {
      setError("Your password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const result = await supabase.auth.signUp({
          email:    form.email.trim().toLowerCase(),
          password: form.password,
          options: {
            data: { full_name: form.name, phone: form.phone },
            // Point to /auth/callback so email confirmation works correctly
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (result.error) {
          const { text } = humanizeError(result.error.message);
          setError(text);
          return;
        }

        // No session means email confirmation is required
        if (!result.data.session) {
          setMessage(
            "Account created! Check your email inbox for a verification link. " +
            "Also check your Spam / Junk folder — it sometimes lands there."
          );
          return;
        }

        // Immediately confirmed (e.g. email confirmation disabled in Supabase settings)
        navigate("/app/setup", { replace: true });
      } else {
        const result = await supabase.auth.signInWithPassword({
          email:    form.email.trim().toLowerCase(),
          password: form.password,
        });

        if (result.error) {
          const { text, isUnverified: unv } = humanizeError(result.error.message);
          setError(text);
          setIsUnverified(unv);
          return;
        }

        navigate("/app", { replace: true });
      }
    } catch (err: any) {
      const { text } = humanizeError(err?.message || "Something went wrong.");
      setError(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      footer={
        isSignup ? (
          <>
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-green-600 font-medium hover:underline">
              Log in
            </button>
          </>
        ) : (
          <>
            Don't have an account?{" "}
            <button onClick={() => navigate("/signup")} className="text-green-600 font-medium hover:underline">
              Start free trial
            </button>
          </>
        )
      }
    >
      <h1 className="text-xl font-bold text-gray-900 mb-1">
        {isSignup ? "Create your account" : "Log in to BizFlow"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {isSignup
          ? "Start your 14-day free trial. No card required."
          : "Welcome back. Enter your details to continue."}
      </p>

      {/* Error banner */}
      {error && (
        <div role="alert" className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-600 leading-snug">{error}</p>
              {isUnverified && (
                <div className="mt-2.5 space-y-1.5">
                  <Link
                    to="/resend-confirmation"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-green-600 hover:underline"
                  >
                    <RefreshCw size={12} />
                    Resend verification email
                  </Link>
                  <p className="text-xs text-red-400">
                    Remember to check <strong>Spam / Junk</strong> after resending.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success message */}
      {message && (
        <div role="status" className="mb-4 rounded-xl bg-green-50 border border-green-200 px-4 py-3">
          <p className="text-sm text-green-700 leading-snug">{message}</p>
          {isSignup && message.includes("Check your email") && (
            <Link
              to="/resend-confirmation"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 hover:underline mt-2"
            >
              <RefreshCw size={12} />
              Didn't receive it? Resend
            </Link>
          )}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        {isSignup && (
          <>
            <Field
              label="Full name"
              placeholder="e.g. John Mukasa"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Field
              label="Phone number"
              placeholder="+256 700 000 000"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </>
        )}

        <Field
          label="Email address"
          type="email"
          placeholder="you@shop.com"
          value={form.email}
          onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(""); setIsUnverified(false); }}
          required
          autoComplete="email"
        />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="block text-sm font-medium text-gray-700">Password</span>
            {!isSignup && (
              <button
                type="button"
                className="text-xs text-green-600 font-medium hover:underline"
                onClick={() => { setShowForgot((v) => !v); setError(""); setIsUnverified(false); }}
              >
                Forgot password?
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={isSignup ? "Create a password (min 8 chars)" : "Your password"}
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(""); }}
              className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 pr-10 focus:outline-none focus:ring-2 focus:ring-green-600"
              required
              autoComplete={isSignup ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Inline forgot password panel */}
        {showForgot && !isSignup && (
          <ForgotPasswordPanel onClose={() => setShowForgot(false)} />
        )}

        <SubmitButton loading={loading}>
          {isSignup ? (
            <>Create account <ArrowRight size={16} /></>
          ) : (
            "Log in"
          )}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}

// ─── Business setup page ──────────────────────────────────────────────────────
export function SetupPage() {
  const navigate = useNavigate();
  const { user, createBusiness, refreshBusiness } = useAuth();
  const [form, setForm] = useState({
    name: "", phone: "", email: user?.email ?? "",
    location: "", currency: "UGX",
  });
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitted) return;
    setError("");
    if (!form.name.trim()) { setError("Business name is required."); return; }
    setSubmitted(true);
    setLoading(true);
    try {
      await createBusiness(form);
      await refreshBusiness();
      navigate("/app", { replace: true });
    } catch (err: any) {
      setSubmitted(false);
      const msg: string = err?.message ?? "";
      if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("already exists")) {
        try {
          await refreshBusiness();
          navigate("/app", { replace: true });
        } catch {
          setError("You already have a business. Try logging out and back in.");
        }
      } else if (msg.toLowerCase().includes("not authenticated") || msg.toLowerCase().includes("signed in")) {
        setError("Your session expired. Please log in again.");
      } else {
        setError(msg || "Could not create your business. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.25} />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight">BizFlow</span>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 via-green-400 to-emerald-500" />
          <div className="p-8">
            <div className="flex items-center gap-2 mb-1">
              <Building2 size={18} className="text-green-600" />
              <h1 className="text-xl font-bold text-gray-900">Set up your business</h1>
            </div>
            <p className="text-sm text-gray-500 mb-6">Tell us about your shop so BizFlow can be ready for you.</p>
            {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-600">{error}</div>}
            <form className="flex flex-col gap-4" onSubmit={submit}>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Business name</span>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. ABC Mobile Phones" required className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</span>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+256 700 000 000" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Email</span>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="shop@business.com" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Location</span>
                <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Kampala, Uganda" className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1.5">Currency</span>
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600">
                  <option value="UGX">UGX — Ugandan Shilling</option>
                  <option value="KES">KES — Kenyan Shilling</option>
                  <option value="TZS">TZS — Tanzanian Shilling</option>
                  <option value="USD">USD — US Dollar</option>
                </select>
              </label>
              <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2.5 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full mt-1">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Setting up…
                  </>
                ) : (
                  <>Continue to BizFlow <ArrowRight size={16} /></>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
