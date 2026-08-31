import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        cairo: ["var(--font-cairo)", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#eef7ff",
          100: "#d9edff",
          200: "#b3ddf5",
          300: "#83c6ea",
          400: "#4aa8d8",
          500: "#0f7ea8",
          600: "#0c6688",
          700: "#0a4f6b",
          800: "#073d54",
          900: "#052a3a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
