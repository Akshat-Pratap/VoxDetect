/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic tokens driven by CSS variables → .light / .dark themes flip all of these
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          card: 'rgb(var(--bg-card-rgb) / <alpha-value>)',
          border: 'rgb(var(--bg-border) / <alpha-value>)',
        },
        // Text — high-contrast neutrals
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        // Brand accent — luminous violet
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          muted: 'rgb(var(--accent-muted) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        // Glass frost — white tint on dark, dark tint on light (theme-aware)
        glass: 'rgb(var(--glass) / <alpha-value>)',
        // Risk bands — refined, subtle
        risk: {
          low: 'rgb(var(--risk-low) / <alpha-value>)',
          'low-bg': 'rgb(var(--risk-low) / var(--risk-low-a))',
          medium: 'rgb(var(--risk-medium) / <alpha-value>)',
          'medium-bg': 'rgb(var(--risk-medium) / var(--risk-medium-a))',
          high: 'rgb(var(--risk-high) / <alpha-value>)',
          'high-bg': 'rgb(var(--risk-high) / var(--risk-high-a))',
          critical: 'rgb(var(--risk-critical) / <alpha-value>)',
          'critical-bg': 'rgb(var(--risk-critical) / var(--risk-critical-a))',
        },
        status: {
          ok: 'rgb(var(--risk-low) / <alpha-value>)',
          warn: 'rgb(var(--risk-medium) / <alpha-value>)',
          danger: 'rgb(var(--risk-critical) / <alpha-value>)',
          info: 'rgb(var(--status-info) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '10px',
        DEFAULT: '14px',
        md: '14px',
        lg: '20px',
        xl: '28px',
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.08)',
        md: '0 4px 12px -4px rgba(0,0,0,0.14)',
        lg: '0 12px 28px -12px rgba(0,0,0,0.22)',
        inner: 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)',
        'float-slow': 'float 18s ease-in-out infinite',
        'float-slower': 'float 26s ease-in-out infinite reverse',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%,100%': { transform: 'translate3d(0,0,0) scale(1)' },
          '50%': { transform: 'translate3d(40px,-30px,0) scale(1.1)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1' }, '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
};
