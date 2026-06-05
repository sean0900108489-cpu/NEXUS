"use client";

import { KeyRound, Lock, Mail, ShieldCheck } from "lucide-react";
import { type FormEvent, useState } from "react";

import {
  ensureNexusSupabaseClientConfigured,
  getNexusSupabaseClient,
} from "@/lib/supabase/client";
import type { IAuthVault } from "@/lib/nexus-types";
import { useNexusStore } from "@/store/nexus-store";

type AuthScreenProps = {
  checked: boolean;
  onAuthenticated?: (
    user: NonNullable<IAuthVault["user"]>,
    accessToken?: string | null,
  ) => void;
};

const AUTH_PROMPT_MESSAGE = "Authenticate to unlock NEXUS // AI OPS.";
const CHECKING_SESSION_MESSAGE = "Checking session...";

export function AuthScreen({ checked, onAuthenticated }: AuthScreenProps) {
  const login = useNexusStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    checked ? AUTH_PROMPT_MESSAGE : CHECKING_SESSION_MESSAGE,
  );
  const displayMessage =
    checked && message === CHECKING_SESSION_MESSAGE ? AUTH_PROMPT_MESSAGE : message;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setMessage("Email and password are required.");
      return;
    }

    setBusy(true);
    setMessage(mode === "login" ? "Opening secure session..." : "Creating operator identity...");

    try {
      await ensureNexusSupabaseClientConfigured();
      const supabase = getNexusSupabaseClient();
      const result =
        mode === "login"
          ? await supabase.auth.signInWithPassword({
              email: trimmedEmail,
              password,
            })
          : await supabase.auth.signUp({
              email: trimmedEmail,
              password,
            });

      if (result.error) {
        setMessage(result.error.message);
        return;
      }

      if (result.data.session?.user) {
        login(result.data.session.user);
        onAuthenticated?.(
          result.data.session.user,
          result.data.session.access_token ?? null,
        );
        setMessage("Identity verified. Loading command center...");
        return;
      }

      setMessage(
        result.data.user
          ? "Check your email to confirm this account before opening NEXUS."
          : "Check your email to confirm this account.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Supabase Auth is unavailable in this environment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="nexus-shell grid min-h-dvh place-items-center overflow-hidden bg-neutral-950 px-4 text-neutral-100">
      <section className="relative w-full max-w-md border border-neutral-300/30 bg-neutral-950/88 p-6 shadow-[0_0_80px_rgba(34,211,238,0.16)] backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-neutral-300/70 to-transparent" />
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center border border-neutral-300/40 bg-neutral-300/10 text-neutral-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-mono text-sm uppercase tracking-[0.28em] text-neutral-100">
              NEXUS // AI OPS
            </h1>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-neutral-500">
              Identity Gate / Global Vault
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              <Mail className="h-3.5 w-3.5" />
              Email
            </span>
            <input
              autoComplete="email"
              className="w-full border border-white/10 bg-black/35 px-3 py-3 font-mono text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/60"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@nexus.local"
              type="email"
              value={email}
            />
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              <KeyRound className="h-3.5 w-3.5" />
              Password
            </span>
            <input
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full border border-white/10 bg-black/35 px-3 py-3 font-mono text-sm text-neutral-100 outline-none transition placeholder:text-neutral-600 focus:border-neutral-300/60"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••••••"
              type="password"
              value={password}
            />
          </label>

          <button
            className="mt-1 flex items-center justify-center gap-2 border border-neutral-300/40 bg-neutral-300/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-100 transition hover:bg-neutral-300/20 disabled:opacity-50"
            disabled={busy}
            type="submit"
          >
            <Lock className="h-4 w-4" />
            {busy ? "Processing" : mode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs leading-5 text-neutral-500">{displayMessage}</p>
          <button
            className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-100 hover:text-white"
            onClick={() => {
              setMode((current) => (current === "login" ? "signup" : "login"));
              setMessage(
                mode === "login" ? "Create an operator account." : AUTH_PROMPT_MESSAGE,
              );
            }}
            type="button"
          >
            {mode === "login" ? "Need Account" : "Have Account"}
          </button>
        </div>
      </section>
    </main>
  );
}
