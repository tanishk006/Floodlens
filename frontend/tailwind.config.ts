import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F4F1EA",
        ink: "#1B1F23",
        muted: "#55595E",
        rule: "#C9C3B6",
        accent: "#0F5C63",
        risk: {
          low: "#7A9E7E",
          moderate: "#D9B44A",
          high: "#D9772B",
          severe: "#A3262A",
        },
        water: {
          1: "#A9CBC7",
          2: "#6FA5A3",
          3: "#3C7F82",
          4: "#0F5C63",
        },
      },
      fontFamily: {
        display: ['"Source Serif 4"', "serif"],
        ui: ['"IBM Plex Sans"', "sans-serif"],
        data: ['"IBM Plex Mono"', "monospace"],
      },
      fontVariantNumeric: {
        tabular: "tabular-nums",
      },
    },
  },
  plugins: [],
} satisfies Config;
