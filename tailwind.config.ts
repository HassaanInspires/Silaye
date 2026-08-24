import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          elevated: "var(--card-elevated)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        gold: {
          primary: "var(--accent-gold-primary)",
          hover: "var(--accent-gold-hover)",
          glow: "var(--accent-gold-glow)",
          subtle: "var(--accent-gold-subtle)",
        },
        linen: {
          bg: "var(--surface-linen-bg)",
          card: "var(--surface-linen-card)",
          "card-muted": "var(--surface-linen-card-muted)",
          border: "var(--surface-linen-border)",
          text: "var(--surface-linen-text)",
          "text-muted": "var(--surface-linen-text-muted)",
        },
        obsidian: {
          bg: "var(--surface-obsidian-bg)",
          card: "var(--surface-obsidian-card)",
          "card-elevated": "var(--surface-obsidian-card-elevated)",
          border: "var(--surface-obsidian-border)",
          "border-subtle": "var(--surface-obsidian-border-subtle)",
          text: "var(--surface-obsidian-text)",
          "text-muted": "var(--surface-obsidian-text-muted)",
        },
        status: {
          booked: "var(--status-booked)",
          cutting: "var(--status-cutting)",
          stitching: "var(--status-stitching)",
          ready: "var(--status-ready)",
          overdue: "var(--status-overdue)",
          "advance-credit": "var(--status-advance-credit)",
          "udhaar-pending": "var(--status-udhaar-pending)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        "urdu-sans": ["var(--font-urdu-sans)", "system-ui", "sans-serif"],
        "urdu-serif": ["var(--font-urdu-serif)", "'Traditional Arabic'", "serif"],
        editorial: ["'Instrument Serif'", "'Cormorant Garamond'", "serif"],
      },
      lineHeight: {
        "urdu-data": "1.65",
        "urdu-display": "2.2",
      },
    },
  },
  plugins: [],
};

export default config;
