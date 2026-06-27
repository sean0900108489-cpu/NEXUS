/**
 * NEXUS Window OS — Desktop Route (/desktop)
 *
 * Entry point for the Window OS desktop experience.
 *
 * Authentication gate:
 * - Checks auth status via API call (same pattern as useNexusHomeData)
 * - Unauthenticated → shows AuthScreen (same as NexusOps)
 * - Authenticated → registers apps + renders NexusDesktopShell
 *
 * The existing "/" route (NexusOps workspace) is preserved unchanged.
 */

"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { NexusDesktopShell } from "@/kernel/window/NexusDesktopShell";
import { registerWindowApp } from "@/kernel/window/window-registry";
import { DEFAULT_WINDOW_APPS } from "@/kernel/window/default-window-apps";
import {
  ensureNexusSupabaseClientConfigured,
  getNexusSupabaseClient,
} from "@/lib/supabase/client";

// ── Lazy-load AuthScreen (keeps bundle light for authenticated users) ──

const AuthScreen = dynamic(
  () =>
    import("@/components/nexus/auth-screen").then((mod) => mod.AuthScreen),
  { ssr: false },
);

// ── Auth Check ─────────────────────────────────────────────────────

type AuthState =
  | { status: "checking" }
  | { status: "authenticated"; userId: string }
  | { status: "unauthenticated" };

function useAuthGate() {
  const [auth, setAuth] = useState<AuthState>({ status: "checking" });

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        await ensureNexusSupabaseClientConfigured();
        const supabase = getNexusSupabaseClient();
        const { data } = await supabase.auth.getSession();

        if (!mounted) return;

        if (data.session?.user) {
          setAuth({
            status: "authenticated",
            userId: data.session.user.id,
          });
        } else {
          setAuth({ status: "unauthenticated" });
        }
      } catch {
        if (mounted) {
          setAuth({ status: "unauthenticated" });
        }
      }
    }

    check();

    // Listen for auth state changes
    let unsubscribe: (() => void) | undefined;
    ensureNexusSupabaseClientConfigured()
      .then(() => {
        if (!mounted) return;
        const supabase = getNexusSupabaseClient();
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!mounted) return;
          if (session?.user) {
            setAuth({
              status: "authenticated",
              userId: session.user.id,
            });
          } else {
            setAuth({ status: "unauthenticated" });
          }
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return auth;
}

// ── Register apps (only when auth is confirmed) ────────────────────

function useRegisterApps() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    for (const def of DEFAULT_WINDOW_APPS) {
      try {
        registerWindowApp(def);
      } catch {
        // Already registered (e.g. HMR), skip silently
      }
    }

    return () => {
      registered.current = false;
    };
  }, []);
}

// ── Page Component ─────────────────────────────────────────────────

export default function DesktopPage() {
  const auth = useAuthGate();

  // Register apps regardless of auth state (definitions don't need auth)
  useRegisterApps();

  // ── Checking ──────────────────────────────────────────

  if (auth.status === "checking") {
    return (
      <div className="nexus-desktop-shell h-dvh w-dvw overflow-hidden bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center text-white/10 animate-pulse">
          <p className="text-3xl font-light">NEXUS</p>
          <p className="text-xs mt-2">Window OS</p>
          <p className="text-[10px] mt-1 text-white/5">Checking session...</p>
        </div>
      </div>
    );
  }

  // ── Unauthenticated ────────────────────────────────────

  if (auth.status === "unauthenticated") {
    return (
      <AuthScreen
        checked={true}
        onAuthenticated={() => {
          // onAuthStateChange will update the state automatically
        }}
      />
    );
  }

  // ── Authenticated ─────────────────────────────────────

  return <NexusDesktopShell />;
}
