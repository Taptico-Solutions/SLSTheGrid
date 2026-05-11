import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        sls: {
          gold: "#d29c3c",
          "gold-light": "#e6a52d",
          "gold-pale": "#f5e9cc",
          "dark-brown": "#1b110b",
          charcoal: "#262b2e",
          "dark-gray": "#32323a",
          sand: "#e6dec2",
          "off-white": "#f9f9f9",
        },
        border: "hsl(var(--border))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Legacy waitlist tokens preserved
        brand: {
          bg: "#030303",
          text: "#f8f8f8",
          gray: "#9e9e9e",
          dim: "#666",
          blue: "#155dfc",
          lightblue: "#50a2ff",
          card: "#0b0b0b",
          border: "#1a1a1a",
          borderlight: "#282828",
        },
      },
      fontFamily: {
        slab: ["var(--font-roboto-slab)", "Roboto Slab", "serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
