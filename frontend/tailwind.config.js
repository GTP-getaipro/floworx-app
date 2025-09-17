/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          primary: {
            DEFAULT: "#2563EB", // Deep Blue – primary CTAs
            hover: "#3B82F6",   // Electric Blue – hover/active
            50:  "#EFF6FF",
            100: "#DBEAFE",
            200: "#BFDBFE",
            300: "#93C5FD",
            400: "#60A5FA",
            500: "#3B82F6",
            600: "#2563EB",
            700: "#1D4ED8",
            800: "#1E40AF",
            900: "#1E3A8A",
          },
        },

        // Neutrals
        ink: {
          DEFAULT: "#111827", // headings / primary text
          sub: "#6B7280",     // secondary text / labels
          muted: "#374151",   // optional mid tone
        },
        surface: {
          DEFAULT: "#FFFFFF", // cards / modals
          soft: "#F9FAFB",    // page background
          subtle: "#F3F4F6",  // panels, info boxes
          border: "#E5E7EB",  // strokes / dividers
        },

        // Feedback
        success:   "#10B981",
        warning:   "#F59E0B",
        danger:    "#EF4444",
        info:      "#06B6D4",

        // Ring and background colors for focus states
        ring: "#3B82F6", // matches brand.primary.hover for consistent focus styling
        background: "#FFFFFF", // matches surface.DEFAULT

        // Legacy colors for backward compatibility
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      boxShadow: {
        card: "0 6px 20px rgba(0,0,0,0.06)",
        focus: "0 0 0 3px rgba(59,130,246,0.45)", // brand.primary.hover
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'large': '0 10px 50px -12px rgba(0, 0, 0, 0.25)',
      },

      borderRadius: {
        xl2: "1rem",
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [
    function ({ addBase }) {
      addBase({
        ":root": {
          "--color-brand": "#2563EB",
          "--color-brand-hover": "#3B82F6",
          "--color-ink": "#111827",
          "--color-ink-sub": "#6B7280",
          "--color-surface": "#FFFFFF",
          "--color-surface-soft": "#F9FAFB",
          "--color-surface-subtle": "#F3F4F6",
          "--color-surface-border": "#E5E7EB",
          "--color-success": "#10B981",
          "--color-warning": "#F59E0B",
          "--color-danger": "#EF4444",
          "--color-info": "#06B6D4",
        },
      });
    },
  ],
}
