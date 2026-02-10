import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Keep existing brand colors (static blue - for backward compatibility)
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        navy: {
          DEFAULT: "#0a1628",
          light: "#111d32",
        },
        // Add dynamic primary palette (CSS vars from color engine)
        primary: {
          50: "hsl(var(--primary-50))",
          100: "hsl(var(--primary-100))",
          200: "hsl(var(--primary-200))",
          300: "hsl(var(--primary-300))",
          400: "hsl(var(--primary-400))",
          500: "hsl(var(--primary-500))",
          600: "hsl(var(--primary-600))",
          700: "hsl(var(--primary-700))",
          800: "hsl(var(--primary-800))",
          900: "hsl(var(--primary-900))",
          950: "hsl(var(--primary-950))",
        },
        // Dynamic accent palette
        accent: {
          50: "hsl(var(--accent-50))",
          100: "hsl(var(--accent-100))",
          200: "hsl(var(--accent-200))",
          300: "hsl(var(--accent-300))",
          400: "hsl(var(--accent-400))",
          500: "hsl(var(--accent-500))",
          600: "hsl(var(--accent-600))",
          700: "hsl(var(--accent-700))",
          800: "hsl(var(--accent-800))",
          900: "hsl(var(--accent-900))",
          950: "hsl(var(--accent-950))",
          // Keep old static accent for backward compatibility
          DEFAULT: "#00d4c4",
          dark: "#00b3a5",
        },
        // Dynamic semantic colors
        success: {
          base: "hsl(var(--success-base))",
          light: "hsl(var(--success-light))",
          dark: "hsl(var(--success-dark))",
        },
        warning: {
          base: "hsl(var(--warning-base))",
          light: "hsl(var(--warning-light))",
          dark: "hsl(var(--warning-dark))",
        },
        danger: {
          base: "hsl(var(--danger-base))",
          light: "hsl(var(--danger-light))",
          dark: "hsl(var(--danger-dark))",
        },
        // Dynamic neutrals
        neutral: {
          50: "hsl(var(--neutral-50))",
          100: "hsl(var(--neutral-100))",
          200: "hsl(var(--neutral-200))",
          300: "hsl(var(--neutral-300))",
          400: "hsl(var(--neutral-400))",
          500: "hsl(var(--neutral-500))",
          600: "hsl(var(--neutral-600))",
          700: "hsl(var(--neutral-700))",
          800: "hsl(var(--neutral-800))",
          900: "hsl(var(--neutral-900))",
          950: "hsl(var(--neutral-950))",
        },
      },
      boxShadow: {
        "elevation-0": "var(--shadow-elevation-0)",
        "elevation-1": "var(--shadow-elevation-1)",
        "elevation-2": "var(--shadow-elevation-2)",
        "elevation-3": "var(--shadow-elevation-3)",
        "elevation-4": "var(--shadow-elevation-4)",
        "elevation-5": "var(--shadow-elevation-5)",
      },
      fontSize: {
        xs: "var(--text-xs)",
        sm: "var(--text-sm)",
        base: "var(--text-base)",
        lg: "var(--text-lg)",
        xl: "var(--text-xl)",
        "2xl": "var(--text-2xl)",
        "3xl": "var(--text-3xl)",
        display: "var(--text-display)",
      },
      animation: {
        press: "press 0.1s ease-out",
        shimmer: "shimmer 2s ease-in-out infinite",
        "fill-border": "fill-border 0.3s ease-out",
        shake: "shake 0.3s ease-in-out",
        "pulse-once": "pulse-once 1s ease-in-out",
        "blink-once": "blink-once 0.6s ease-in-out",
      },
      keyframes: {
        press: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(2px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fill-border": {
          "0%": { width: "0" },
          "100%": { width: "100%" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        "pulse-once": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "blink-once": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
      },
      screens: {
        xs: "375px",
      },
    },
  },
  safelist: [
    // Dynamic primary colors (for runtime theme injection)
    {
      pattern:
        /bg-primary-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern:
        /text-primary-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern:
        /border-primary-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    // Dynamic accent colors
    {
      pattern:
        /bg-accent-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    {
      pattern:
        /text-accent-(50|100|200|300|400|500|600|700|800|900|950)/,
    },
    // Semantic colors
    {
      pattern: /bg-(success|warning|danger)-(base|light|dark)/,
    },
    {
      pattern: /text-(success|warning|danger)-(base|light|dark)/,
    },
    {
      pattern: /border-(success|warning|danger)-(base|light|dark)/,
    },
  ],
  plugins: [],
};

export default config;
