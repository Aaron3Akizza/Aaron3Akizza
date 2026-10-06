import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { TrendingUp, Mail, ArrowRight, CheckCircle, AlertTriangle, RefreshCw } from "lucide-react";

function Shell({ children }: { children: React.ReactNode }) {
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
          <div className="p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function ResendConfirmationPage() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState("");

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    setLoading(true);
    try {
      // resend() sends a new confirmation email to an existing unconfirmed account
      const { error: err } = await supabase.auth.resend({
        type:  "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (err) {
        // Supabase returns a generic message for security — still show success
        // to avoid revealing which emails are registered.
        if (err.message.toLowerCase().includes("rate limit") ||
            err.message.toLowerCase().includes("too many")) {
          setError("Too many requests. Please wait a few minutes before trying again.");
          return;
        }
      }

      setSent(true);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Shell>
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Inbox</h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            If <strong className="text-gray-900">{email}</strong> has a BizFlow account
            waiting for confirmation, a new verification email has been sent.
          </p>

          {/* Instructions box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-2">Can't find the email?</p>
            <ul className="text-xs text-amber-700 space-y-1.5 list-disc list-inside leading-relaxed">
              <li>Check your <strong>Spam / Junk</strong> folder</li>
              <li>Check your <strong>Promotions</strong> tab (Gmail)</li>
              <li>The link is valid for <strong>24 hours</strong></li>
              <li>Search for an email from <strong>Supabase</strong> or <strong>noreply@</strong></li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg border border-gray-200 text-gray-700 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              <RefreshCw size={15} />
              Try a different email
            </button>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700"
            >
              Back to Login <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center gap-2 mb-1">
        <Mail size={18} className="text-green-600" />
        <h1 className="text-xl font-bold text-gray-900">Resend Verification Email</h1>
      </div>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        If you didn't receive the confirmation email or the link expired,
        enter your email below and we'll send a new one.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <label className="block">
          <span className="block text-sm font-medium text-gray-700 mb-1.5">
            Email Address
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            placeholder="you@shop.com"
            required
            disabled={loading}
            autoComplete="email"
            className="w-full rounded-lg border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent disabled:opacity-50"
          />
        </label>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 flex items-start gap-2.5">
            <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <RefreshCw size={15} />
              Send Verification Email
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-5 border-t border-gray-100 text-center text-sm text-gray-500">
        Already verified?{" "}
        <Link to="/login" className="text-green-600 font-medium hover:underline">
          Log in
        </Link>
        {" · "}
        <Link to="/signup" className="text-green-600 font-medium hover:underline">
          Register
        </Link>
      </div>
    </Shell>
  );
}
