import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Deep cinematic surface palette
        surface: {
          DEFAULT: "#0B1120",
          raised: "#111827",
          overlay: "#1A2332",
          border: "#1E293B",
          subtle: "#243044",
        },
        // Text hierarchy
        text: {
          primary: "#F1F5F9",
          secondary: "#94A3B8",
          muted: "#64748B",
          disabled: "#475569",
        },
        // Electric cyan accent
        accent: {
          DEFAULT: "#22D3EE",
          dim: "#0EA5C9",
          glow: "rgba(34,211,238,0.15)",
          subtle: "rgba(34,211,238,0.08)",
        },
        // Risk spectrum
        risk: {
          low: "#34D399",
          moderate: "#FBBF24",
          high: "#F97316",
          severe: "#EF4444",
          insufficient: "#64748B",
        },
        // Legacy compatibility (tests may reference these)
        paper: "#0B1120",
        ink: "#F1F5F9",
        muted: "#64748B",
        rule: "#1E293B",
      },
      fontFamily: {
        display: ['"Inter"', "system-ui", "sans-serif"],
        ui: ['"Inter"', "system-ui", "sans-serif"],
        data: ['"JetBrains Mono"', '"IBM Plex Mono"', "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        xs: "0.125rem",
      },
      boxShadow: {
        glow: "0 0 20px rgba(34,211,238,0.12)",
        "glow-sm": "0 0 8px rgba(34,211,238,0.10)",
        card: "0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)",
        "card-hover": "0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
