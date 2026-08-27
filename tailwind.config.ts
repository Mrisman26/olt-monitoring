import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
        },
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(20, 184, 166, 0.14), 0 16px 40px rgba(6, 23, 18, 0.16)",
        soft: "0 1px 2px rgba(11, 32, 36, 0.05), 0 12px 32px -12px rgba(11, 32, 36, 0.12)",
        lift: "0 2px 4px rgba(11, 32, 36, 0.06), 0 24px 48px -16px rgba(11, 32, 36, 0.2)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
}

export default config
