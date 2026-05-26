import type { Config } from "tailwindcss";

const config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg-base)",
        foreground: "var(--text-main)",
        primary: "var(--color-primary)",
        panel: "var(--panel-bg)",
        "panel-muted": "var(--panel-muted)",
        border: "var(--border-subtle)",
        glow: "var(--border-glow)",
        muted: "var(--text-muted)",
        soft: "var(--text-soft)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
      },
      boxShadow: {
        glow: "var(--shadow-glow)",
        panel: "var(--shadow-panel)",
      },
      borderRadius: {
        base: "var(--radius-base)",
      },
      backdropBlur: {
        glass: "var(--backdrop-blur)",
      },
      borderWidth: {
        base: "var(--border-width)",
      },
      fontFamily: {
        main: "var(--font-main)",
      },
    },
  },
} satisfies Config;

export default config;
