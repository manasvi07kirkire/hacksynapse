import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx,css}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#100E0C",
          850: "#15110D",
          800: "#1A1613",
          750: "#221C17",
          700: "#2B241D",
        },
        line: {
          600: "#383027",
          500: "#4A4034",
        },
        bone: {
          100: "#F4EDE1",
          300: "#D6CBB8",
          500: "#A2937C",
          700: "#6E6353",
        },
        ember: {
          600: "#C23F10",
          500: "#E8531C",
          400: "#F26A2E",
          tint: "#2A150C",
          soft: "#FEF3EE",
        },
        marigold: {
          600: "#B4791F",
          400: "#E7A13A",
          tint: "#241B0D",
          soft: "#FEF8EE",
        },
        patina: {
          600: "#2E6E62",
          500: "#3E8C7E",
          400: "#4FA695",
          tint: "#0F211E",
          soft: "#EEF8F5",
        },
        steel: {
          400: "#6E8CA0",
        },
        paper: {
          50: "#F6F0E6",
          100: "#EDE4D5",
          200: "#E0D4C0",
        },
        espresso: {
          900: "#1B1510",
          700: "#453A2E",
        },
        darkSurface: {
          DEFAULT: "#1A1613",
          code: "#1E1E1E",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F6F0E6",
        },
      },
      fontFamily: {
        display: [
          "Fraunces",
          "TeX Gyre Pagella",
          "Palatino",
          "Georgia",
          "serif",
        ],
        sans: ["Hanken Grotesk", "Carlito", "Helvetica Neue", "Arial", "sans-serif"],
        ui: ["Hanken Grotesk", "Carlito", "Helvetica Neue", "Arial", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "Commit Mono",
          "DejaVu Sans Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "display-xl": ["3.25rem", { lineHeight: "3.5rem" }],
        "display-l": ["2.25rem", { lineHeight: "2.625rem" }],
        "heading-m": ["1.5rem", { lineHeight: "1.875rem" }],
        "mono-num-xl": ["4rem", { lineHeight: "4rem" }],
        "mono-label": [
          "0.6875rem",
          { lineHeight: "0.875rem", letterSpacing: "0.06em" },
        ],
        caption: ["0.78125rem", { lineHeight: "1.125rem" }],
      },
      borderRadius: {
        DEFAULT: "5px",
        sm: "3px",
        md: "5px",
        lg: "8px",
      },
      boxShadow: {
        cta: "0 0 0 1px #C23F10, 0 6px 20px rgba(232, 83, 28, 0.22)",
      },
      maxWidth: {
        content: "75rem",
      },
      transitionTimingFunction: {
        instrument: "cubic-bezier(0.2, 0.6, 0.2, 1)",
      },
      transitionDuration: {
        DEFAULT: "160ms",
      },
      spacing: {
        touch: "40px",
      },
      minHeight: {
        touch: "40px",
      },
      animation: {
        "fade-in": "fadeIn 160ms cubic-bezier(0.2, 0.6, 0.2, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
