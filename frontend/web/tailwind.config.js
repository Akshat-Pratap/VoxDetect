/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'rgb(var(--bg) / <alpha-value>)',
          surface: 'rgb(var(--bg-surface) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)',
          card: 'rgb(var(--bg-card-rgb) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          muted: 'rgb(var(--accent-muted) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
        },
        border: {
          DEFAULT: 'rgb(var(--border) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        },
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
          online: 'rgb(var(--status-online) / <alpha-value>)',
          offline: 'rgb(var(--status-offline) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
      },
      boxShadow: {
        sm: '0 1px 2px rgba(0,0,0,0.25)',
        md: '0 2px 8px -2px rgba(0,0,0,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-up': 'slideInUp 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideInUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [
    ({ addVariant }) => {
      addVariant('light', ':is(:where(.light) &)');
    },
  ],
};
