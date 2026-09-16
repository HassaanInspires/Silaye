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
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
          elevated: "rgb(var(--card-elevated) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        border: {
          DEFAULT: "rgb(var(--border) / <alpha-value>)",
          subtle: "rgb(var(--border-subtle) / <alpha-value>)",
        },
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
        surface: {
          DEFAULT: "rgb(var(--surface-card) / <alpha-value>)",
          card: "rgb(var(--surface-card) / <alpha-value>)",
          elevated: "rgb(var(--surface-card-elevated) / <alpha-value>)",
          input: "rgb(var(--surface-input) / <alpha-value>)",
        },
        "surface-input": "rgb(var(--surface-input) / <alpha-value>)",
        "border-input": "rgb(var(--border-input) / <alpha-value>)",
        gold: {
          DEFAULT: '#d4af37',
          muted: '#927825',
          glow: 'rgba(212, 175, 55, 0.3)',
          primary: 'var(--accent-gold-primary)',
          hover: 'var(--accent-gold-hover)',
          subtle: 'var(--accent-gold-subtle)',
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
      letterSpacing: {
        tighter: '-0.04em',
        widest: '0.2em',
      },
    },
  },
  plugins: [],
};

export default config;
