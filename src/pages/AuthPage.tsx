import { FormEvent, useState } from "react";
import { ArrowRight, Building2, Eye, EyeOff, TrendingUp } from "lucide-react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

function humanizeError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) return "The email or password is incorrect.";
  if (lower.includes("user already registered")) return "An account with this email already exists.";
  if (lower.includes("email not confirmed")) return "Please confirm your email before signing in.";
  return "We could not complete that request. Check your details and try again.";
}

function AuthShell({ children, footer }: { children: React.ReactNode; footer?: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12"><div className="w-full max-w-md"><div className="flex items-center justify-center gap-2 mb-8"><div className="h-9 w-9 rounded-lg bg-green-600 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-white" strokeWidth={2.25} /></div><span className="text-xl font-bold text-gray-900 tracking-tight">BizFlow</span></div><div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8">{children}</div>{footer && <p className="text-center text-sm text-gray-500 mt-6">{footer}</p>}</div></div>;
}

function Field({ label, ...props }: { label: string; [key: string]: string | boolean | ((event: React.ChangeEvent<HTMLInputElement>) => void) }) {
  return <label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">{label}</span><input className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" {...props} /></label>;
}

function SubmitButton({ children, loading }: { children: React.ReactNode; loading: boolean }) {
  return <button disabled={loading} className="inline-flex items-center justify-center gap-2 font-medium rounded-lg px-4 py-2.5 text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 w-full mt-1">{loading ? "Please wait..." : children}</button>;
}

export function AuthPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isDemo } = useAuth();

  // ── Demo mode — show a simple entry screen ──────────────────────────────
  if (isDemo) {
    return (
      <AuthShell>
        <div className="text-center">
          <div className="h-14 w-14 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4">
            <TrendingUp size={24} className="text-amber-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">BizFlow Demo</h1>
          <p className="text-sm text-gray-500 mb-6">
            You are running in demo mode. No real account is needed — click below to explore the full system with sample data.
          </p>
          <button
            onClick={() => navigate("/app", { replace: true })}
            className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white px-4 py-3 text-sm font-semibold hover:bg-green-700"
          >
            Enter demo <ArrowRight size={16} />
          </button>
          <p className="text-xs text-gray-400 mt-4">
            To go live, add your Supabase credentials to the <code className="bg-gray-100 px-1 rounded">.env</code> file.
          </p>
        </div>
      </AuthShell>
    );
  }
  const { configured } = useAuth();
  const isSignup = params.get("mode") === "signup" || location.pathname === "/signup";
  const isReset = params.get("mode") === "reset";
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Password reset request ──────────────────────────────────────────
  if (isReset) {
    return (
      <AuthShell footer={<><button onClick={() => navigate("/login")} className="text-green-600 font-medium hover:underline">Back to login</button></>}>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Reset your password</h1>
        <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send you a reset link.</p>
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
        {message && <div role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">{message}</div>}
        <form className="flex flex-col gap-4" onSubmit={async (e) => {
          e.preventDefault();
          setError(""); setMessage("");
          if (!supabase) { setError("Supabase is not configured."); return; }
          setLoading(true);
          const { error: err } = await supabase.auth.resetPasswordForEmail(form.email, {
            redirectTo: `${window.location.origin}/login?mode=update-password`,
          });
          setLoading(false);
          if (err) { setError("Could not send reset email. Check the address and try again."); return; }
          setMessage("Reset link sent! Check your email inbox.");
        }}>
          <Field label="Email" type="email" placeholder="you@shop.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <SubmitButton loading={loading}>Send reset link</SubmitButton>
        </form>
      </AuthShell>
    );
  }

  // ── New password after clicking reset link ──────────────────────────
  if (params.get("mode") === "update-password") {
    return (
      <AuthShell>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Set new password</h1>
        <p className="text-sm text-gray-500 mb-6">Choose a new password for your account.</p>
        {error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}
        {message && <div role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">{message}</div>}
        <form className="flex flex-col gap-4" onSubmit={async (e) => {
          e.preventDefault();
          setError(""); setMessage("");
          if (!supabase) return;
          if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
          setLoading(true);
          const { error: err } = await supabase.auth.updateUser({ password: form.password });
          setLoading(false);
          if (err) { setError("Could not update password. The link may have expired."); return; }
          setMessage("Password updated! Redirecting...");
          setTimeout(() => navigate("/app", { replace: true }), 1500);
        }}>
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">New password</span>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label="Toggle">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
          </label>
          <SubmitButton loading={loading}>Set new password <ArrowRight size={16} /></SubmitButton>
        </form>
      </AuthShell>
    );
  }

  // ── Login / Signup ──────────────────────────────────────────────────
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!configured || !supabase) { setError("Supabase is not configured. Add the VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values."); return; }
    if (form.password.length < 8) { setError("Your password must be at least 8 characters."); return; }
    setLoading(true);
    const result = isSignup
      ? await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name, phone: form.phone }, emailRedirectTo: `${window.location.origin}/login` } })
      : await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
    setLoading(false);
    if (result.error) { setError(humanizeError(result.error.message)); return; }
    if (isSignup && !result.data.session) { setMessage("Account created. Confirm your email, then log in to finish setting up your shop."); return; }
    navigate("/app", { replace: true });
  };

  return <AuthShell footer={isSignup ? <>Already have an account? <button onClick={() => navigate("/login")} className="text-green-600 font-medium hover:underline">Log in</button></> : <>Don't have an account? <button onClick={() => navigate("/signup")} className="text-green-600 font-medium hover:underline">Start free trial</button></>}><h1 className="text-xl font-bold text-gray-900 mb-1">{isSignup ? "Create your account" : "Log in to BizFlow"}</h1><p className="text-sm text-gray-500 mb-6">{isSignup ? "Start your 14-day free trial. No card required." : "Welcome back. Enter your details to continue."}</p>{error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}{message && <div role="status" className="mb-4 rounded-lg bg-green-50 px-3 py-2.5 text-sm text-green-700">{message}</div>}<form className="flex flex-col gap-4" onSubmit={submit}>{isSignup && <><Field label="Full name" placeholder="e.g. John Mukasa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Field label="Phone" placeholder="+256 700 000 000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></>}<Field label="Email" type="email" placeholder="you@shop.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Password</span><div className="relative"><input type={showPassword ? "text" : "password"} placeholder={isSignup ? "Create a password" : "Enter your password"} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" required /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>{!isSignup && <div className="flex justify-end -mt-1"><button type="button" className="text-xs text-green-600 font-medium hover:underline" onClick={() => navigate("/login?mode=reset")}>Forgot password?</button></div>}<SubmitButton loading={loading}>{isSignup ? <>Create account <ArrowRight size={16} /></> : "Log in"}</SubmitButton></form></AuthShell>;
}

export function SetupPage() {
  const navigate = useNavigate();
  const { user, createBusiness } = useAuth();
  const [form, setForm] = useState({ name: "", phone: "", email: user?.email ?? "", location: "", currency: "UGX" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); setLoading(true); try { await createBusiness(form); navigate("/app", { replace: true }); } catch { setError("We could not create your business. Check your connection and try again."); } finally { setLoading(false); } };
  return <AuthShell><div className="flex items-center gap-2 mb-1"><Building2 size={18} className="text-green-600" /><h1 className="text-xl font-bold text-gray-900">Set up your business</h1></div><p className="text-sm text-gray-500 mb-6">Tell us about your shop so BizFlow can be ready for you.</p>{error && <div role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">{error}</div>}<form className="flex flex-col gap-4" onSubmit={submit}><Field label="Business name" placeholder="e.g. ABC Mobile Phones" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /><Field label="Phone number" placeholder="+256 700 000 000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /><Field label="Email" type="email" placeholder="shop@business.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /><Field label="Location" placeholder="e.g. Kampala, Uganda" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /><label className="block"><span className="block text-sm font-medium text-gray-700 mb-1.5">Currency</span><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"><option value="UGX">UGX - Ugandan Shilling</option><option value="KES">KES - Kenyan Shilling</option><option value="TZS">TZS - Tanzanian Shilling</option><option value="USD">USD - US Dollar</option></select></label><SubmitButton loading={loading}>Continue to BizFlow <ArrowRight size={16} /></SubmitButton></form></AuthShell>;
}
