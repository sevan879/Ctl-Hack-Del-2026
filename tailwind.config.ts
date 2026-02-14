import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#1a1a2e",
        foreground: "#eeeeee",
        primary: {
          DEFAULT: "#e94560",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#16213e",
          foreground: "#eeeeee",
        },
        muted: {
          DEFAULT: "#0f3460",
          foreground: "#a0a0b8",
        },
        accent: {
          DEFAULT: "#533483",
          foreground: "#eeeeee",
        },
        card: {
          DEFAULT: "#16213e",
          foreground: "#eeeeee",
        },
        destructive: {
          DEFAULT: "#ff4444",
          foreground: "#ffffff",
        },
        border: "#0f3460",
        input: "#0f3460",
        ring: "#e94560",
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      keyframes: {
        "flip-in": {
          "0%": { transform: "rotateY(90deg)", opacity: "0" },
          "100%": { transform: "rotateY(0deg)", opacity: "1" },
        },
        "flip-out": {
          "0%": { transform: "rotateY(0deg)", opacity: "1" },
          "100%": { transform: "rotateY(90deg)", opacity: "0" },
        },
      },
      animation: {
        "flip-in": "flip-in 0.3s ease-out",
        "flip-out": "flip-out 0.3s ease-in",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
