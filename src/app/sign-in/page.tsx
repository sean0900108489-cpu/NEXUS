"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ensureNexusSupabaseClientConfigured,
  getNexusSupabaseClient,
} from "@/lib/supabase/client";
import { KeyRound, Lock, Mail, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";

/**
 * Sign In — real Supabase Auth flow.
 *
 * E-1: Replaces thin page placeholder with actual login/signup.
 * After successful authentication, redirects to Home (/).
 * Reuses Supabase client infrastructure from @/lib/supabase/client.
 */
export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"info" | "error" | "success">("info");
  const [checked, setChecked] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  // Check existing session on mount
  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        await ensureNexusSupabaseClientConfigured();
        const supabase = getNexusSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (mounted && data.session?.user) {
          setHasSession(true);
          setMessage("Already signed in. Redirecting...");
          setMessageType("success");
          router.replace("/");
        }
      } catch {
        // No session or config unavailable — show form
      } finally {
        if (mounted) setChecked(true);
      }
    }
    check();
    return () => { mounted = false; };
  }, [router]);

  const displayMessage = message ?? (
    checked
      ? "Authenticate to unlock NEXUS // AI OPS."
      : "Checking session..."
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setMessage("Email and password are required.");
      setMessageType("error");
      return;
    }

    setBusy(true);
    setMessage(mode === "login" ? "Opening secure session..." : "Creating operator identity...");
    setMessageType("info");

    try {
      await ensureNexusSupabaseClientConfigured();
      const supabase = getNexusSupabaseClient();
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({ email: trimmedEmail, password })
          : await supabase.auth.signUp({ email: trimmedEmail, password });

      if (result.error) {
        setMessage(result.error.message);
        setMessageType("error");
        return;
      }

      if (result.data.session?.user) {
        setMessage("Identity verified. Redirecting...");
        setMessageType("success");
        router.replace("/");
        return;
      }

      // signUp may require email confirmation
      setMessage(
        result.data.user
          ? "Check your email to confirm this account before signing in."
          : "Check your email to confirm this account.",
      );
      setMessageType("success");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication is unavailable in this environment.",
      );
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  };

  if (hasSession) {
    return (
      <div className="nexus-thin-page">
        <div className="nexus-thin-page-card">
          <CheckCircle className="h-10 w-10 mx-auto text-green-400 mb-4" />
          <h1>Already Signed In</h1>
          <p className="nexus-muted">Redirecting to Home...</p>
        </div>
      </div>
    );
  }

  const MessageIcon = messageType === "error" ? AlertCircle : messageType === "success" ? CheckCircle : null;

  return (
    <main className="nexus-thin-page">
      <section className="nexus-thin-page-card" style={{ maxWidth: "420px" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="grid h-11 w-11 place-items-center border border-neutral-300/40 bg-neutral-300/10 text-neutral-100 rounded-lg">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm uppercase tracking-[0.2em] text-neutral-100">
              NEXUS // AI OPS
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Identity Gate
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="block text-left">
            <span className="mb-1.5 flex items-center gap-2 text-xs text-neutral-400">
              <Mail className="h-3.5 w-3.5" />
              Email
            </span>
            <input
              autoComplete="email"
              className="w-full border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-neutral-100 outline-none rounded-lg placeholder:text-neutral-600 focus:border-neutral-300/60"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@nexus.local"
              type="email"
              value={email}
            />
          </label>

          <label className="block text-left">
            <span className="mb-1.5 flex items-center gap-2 text-xs text-neutral-400">
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-neutral-100 outline-none rounded-lg placeholder:text-neutral-600 focus:border-neutral-300/60"
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              type="password"
              value={password}
            />
          </label>

          <button
            className="flex items-center justify-center gap-2 border border-neutral-300/40 bg-neutral-300/10 px-4 py-2.5 text-sm font-medium text-neutral-100 rounded-lg transition hover:bg-neutral-300/20 disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            <Lock className="h-4 w-4" />
            {busy ? "Processing" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className={`text-xs leading-5 flex items-center gap-1.5 ${
            messageType === "error" ? "text-red-400" :
            messageType === "success" ? "text-green-400" :
            "text-neutral-500"
          }`}>
            {MessageIcon && <MessageIcon className="h-3.5 w-3.5 shrink-0" />}
            {displayMessage}
          </p>
          <button
            className="shrink-0 text-xs text-neutral-100 hover:text-white underline underline-offset-2"
            onClick={() => {
              setMode((c) => (c === "login" ? "signup" : "login"));
              setMessage(null);
            }}
            type="button"
          >
            {mode === "login" ? "Create Account" : "Sign In"}
          </button>
        </div>

        <p className="mt-4 text-xs text-neutral-600">
          <a href="/" className="text-neutral-500 hover:text-neutral-300">
            ← Back to Home
          </a>
        </p>
      </section>
    </main>
  );
}
