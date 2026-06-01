import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1.25rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1320px",
      },
    },
    extend: {
      colors: {
        ink: {
          950: "#05060A",
          900: "#0A0C14",
          850: "#10131D",
          800: "#161A26",
          700: "#1F2433",
          500: "#3A4255",
          300: "#7C8499",
          100: "#D4D8E4",
          50: "#EEF0F7",
        },
        electric: {
          DEFAULT: "#3D7BFF",
          400: "#5C92FF",
          500: "#3D7BFF",
          600: "#2563EB",
          700: "#1D4ED8",
        },
        neon: {
          DEFAULT: "#8B5CF6",
          400: "#A78BFA",
          500: "#8B5CF6",
          600: "#7C3AED",
        },
        signal: {
          DEFAULT: "#22D3EE",
          400: "#22D3EE",
          500: "#06B6D4",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, transparent 0%, #05060A 85%), linear-gradient(rgba(124,132,153,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(124,132,153,0.08) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(900px circle at 50% -10%, rgba(61,123,255,0.25), transparent 60%), radial-gradient(700px circle at 90% 20%, rgba(139,92,246,0.18), transparent 55%), radial-gradient(700px circle at 10% 35%, rgba(34,211,238,0.12), transparent 55%)",
      },
      backgroundSize: {
        grid: "100% 100%, 56px 56px, 56px 56px",
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        shimmer: "shimmer 8s linear infinite",
        blob: "blob 18s ease-in-out infinite",
        "pulse-soft": "pulse-soft 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(30px,-20px) scale(1.05)" },
          "66%": { transform: "translate(-20px,15px) scale(0.97)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.65" },
          "50%": { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [animate],
};

export default config;
