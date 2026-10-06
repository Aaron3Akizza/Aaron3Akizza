import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CheckCircle, XCircle, RefreshCw, TrendingUp } from "lucide-react";

type Status = "processing" | "success" | "error";

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
          <div className="p-8 text-center">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("processing");
  const [message, setMessage] = useState("Verifying your account…");
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    const handle = async () => {
      try {
        if (!supabase) throw new Error("Supabase is not configured.");

        // Parse both query string (?code=) and hash fragment (#access_token=)
        const queryParams = new URLSearchParams(window.location.search);
        const hashParams  = new URLSearchParams(window.location.hash.replace("#", ""));

        const errorParam = queryParams.get("error");
        const errorDesc  = queryParams.get("error_description");
        const code       = queryParams.get("code");
        const hashToken  = hashParams.get("access_token");

        // Supabase sometimes puts an error in the URL for expired/invalid links
        if (errorParam) {
          throw new Error(
            errorDesc?.replace(/\+/g, " ") ||
              "Verification failed. The link may have expired."
          );
        }

        // PKCE flow — exchange code for session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        // Implicit flow — tokens arrive in the URL hash
        // The Supabase client processes the hash automatically when we call getSession()
        if (!code && hashToken) {
          await new Promise((r) => setTimeout(r, 800));
        }

        // Get the session (works for both flows)
        let { data: { session } } = await supabase.auth.getSession();

        // Sometimes it takes a moment — retry once
        if (!session) {
          await new Promise((r) => setTimeout(r, 1500));
          const retry = await supabase.auth.getSession();
          session = retry.data.session;
        }

        if (!session) {
          throw new Error(
            "Could not verify your account. The link may have expired or already been used."
          );
        }

        // Determine what kind of link this was
        const type = queryParams.get("type") || hashParams.get("type") || "";
        const isReset = type === "recovery";
        setIsRecovery(isReset);

        if (isReset) {
          setStatus("success");
          setMessage("Identity verified. Redirecting to set your new password…");
          setTimeout(() => navigate("/login?mode=update-password"), 1800);
        } else {
          // Email confirmation (signup or email change)
          setStatus("success");
          setMessage("Your email is verified! Taking you to your dashboard…");
          setTimeout(() => navigate("/app/setup"), 2500);
        }
      } catch (err: any) {
        const raw: string = err?.message ?? "";
        let friendly = "Verification failed. Please try again.";

        if (raw.includes("expired") || raw.includes("invalid"))
          friendly = "This link has expired or is invalid. Request a new verification email below.";
        else if (raw.includes("already") || raw.includes("used"))
          friendly = "This link has already been used. If your email is verified, just log in.";
        else if (raw.includes("network") || raw.includes("fetch"))
          friendly = "Network error. Check your internet connection and try again.";
        else if (raw)
          friendly = raw;

        setStatus("error");
        setMessage(friendly);
      }
    };

    handle();
  }, [navigate]);

  return (
    <Shell>
      {/* Processing */}
      {status === "processing" && (
        <>
          <div className="w-14 h-14 rounded-full bg-green-50 border-2 border-green-200 flex items-center justify-center mx-auto mb-5">
            <svg className="animate-spin h-7 w-7 text-green-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying…</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Please wait while we verify your account.
            <br />Do not close this page.
          </p>
        </>
      )}

      {/* Success */}
      {status === "success" && (
        <>
          <div className="w-14 h-14 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isRecovery ? "Identity Verified!" : "Email Verified!"}
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">{message}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <svg className="animate-spin h-3.5 w-3.5 text-green-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Redirecting…
          </div>
        </>
      )}

      {/* Error */}
      {status === "error" && (
        <>
          <div className="w-14 h-14 rounded-full bg-red-100 border-2 border-red-200 flex items-center justify-center mx-auto mb-5">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification Failed</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-6">{message}</p>

          <div className="flex flex-col gap-3">
            <Link
              to="/resend-confirmation"
              className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-green-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-green-700"
            >
              <RefreshCw size={15} />
              Request New Verification Email
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full rounded-lg border border-gray-200 text-gray-700 px-4 py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Back to Login
            </Link>
          </div>

          {/* Support note */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400 leading-relaxed">
              Still having trouble? Contact{" "}
              <strong className="text-gray-600">BizFlow Support</strong> or ask
              your system administrator to check your account.
            </p>
          </div>
        </>
      )}
    </Shell>
  );
}
