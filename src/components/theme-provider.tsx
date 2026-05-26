"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="cyberpunk"
      disableTransitionOnChange
      enableSystem={false}
      themes={["cyberpunk", "apple", "tesla", "terminal"]}
    >
      {children}
    </NextThemesProvider>
  );
}
