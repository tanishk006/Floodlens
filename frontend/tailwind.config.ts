import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Source of truth exact palette
        "floral-white": {
          50: "#fff9e5",
          100: "#fff3cc",
          200: "#ffe799",
          300: "#ffdb66",
          400: "#ffcf33",
          500: "#ffc300",
          600: "#cc9c00",
          700: "#997500",
          800: "#664e00",
          900: "#332700",
          950: "#241b00",
        },
        "dust-grey": {
          50: "#f4f3f0",
          100: "#eae7e1",
          200: "#d4cec4",
          300: "#bfb6a6",
          400: "#a99d89",
          500: "#94856b",
          600: "#766a56",
          700: "#595040",
          800: "#3b352b",
          900: "#1e1b15",
          950: "#15130f",
        },
        "charcoal-brown": {
          50: "#f3f2f1",
          100: "#e7e6e4",
          200: "#cfccc9",
          300: "#b7b3ae",
          400: "#9f9a93",
          500: "#878178",
          600: "#6c6760",
          700: "#514d48",
          800: "#363330",
          900: "#1b1a18",
          950: "#131211",
        },
        "carbon-black": {
          50: "#f3f2f2",
          100: "#e7e6e4",
          200: "#cecdca",
          300: "#b6b4af",
          400: "#9d9a95",
          500: "#85817a",
          600: "#6a6762",
          700: "#504e49",
          800: "#353431",
          900: "#1b1a18",
          950: "#131211",
        },
        "spicy-paprika": {
          50: "#fdeee8",
          100: "#fbdcd0",
          200: "#f6baa2",
          300: "#f29773",
          400: "#ee7444",
          500: "#e95216",
          600: "#bb4111",
          700: "#8c310d",
          800: "#5d2109",
          900: "#2f1004",
          950: "#210b03",
        },

        // Semantic tokens
        "app-bg": "#131211",
        surface: {
          DEFAULT: "#1b1a18",
          primary: "#1b1a18",
          secondary: "#1e1b15",
          elevated: "#24211c",
          raised: "#1b1a18",
          overlay: "#24211c",
          border: "#363330",
          subtle: "#1e1b15",
          sunken: "#131211",
        },
        border: {
          DEFAULT: "#363330",
          subtle: "#363330",
          strong: "#514d48",
        },
        text: {
          DEFAULT: "#f4f3f0",
          primary: "#f4f3f0",
          secondary: "#b7b3ae",
          muted: "#878178",
          disabled: "#514d48",
        },
        accent: {
          DEFAULT: "#cc9c00",
          primary: "#cc9c00",
          emphasis: "#ffc300",
          text: "#fff3cc",
          dim: "#997500",
          subtle: "rgba(204,156,0,0.12)",
        },
        warning: {
          DEFAULT: "#bb4111",
          primary: "#bb4111",
          soft: "#5d2109",
        },

        // Controlled Risk Spectrum (replaces neon)
        risk: {
          low: "#766a56",
          moderate: "#cc9c00",
          high: "#bb4111",
          severe: "#8c310d",
          insufficient: "#514d48",
        },

        // Legacy compatibility
        paper: "#131211",
        ink: "#f4f3f0",
        muted: "#878178",
        rule: "#363330",
      },
      fontFamily: {
        display: ['"Poppins"', "sans-serif"],
        ui: ['"Poppins"', "sans-serif"],
        sans: ['"Poppins"', "sans-serif"],
        data: ['"JetBrains Mono"', "monospace"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        xs: "0.125rem",
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0, 0, 0, 0.4)",
        card: "0 1px 2px rgba(0, 0, 0, 0.35)",
        "card-hover": "0 2px 8px rgba(0, 0, 0, 0.45)",
      },
      transitionTimingFunction: {
        gentle: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
} satisfies Config;
