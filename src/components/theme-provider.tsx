"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="surface-shell"
      disableTransitionOnChange
      enableSystem={false}
      themes={["surface-shell", "apple", "tesla", "terminal"]}
    >
      {children}
    </NextThemesProvider>
  );
}
