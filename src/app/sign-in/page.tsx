"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Sign In — redirect to NEXUS entry.
 *
 * NexusOps (at "/") has its own built-in AuthScreen gate.
 * /sign-in simply redirects there.
 */
export default function SignInRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
