/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        bg: {
          DEFAULT: '#0d1117',
          surface: '#161b22',
          elevated: '#1c2230',
          card: '#1e2433',
          border: '#2a3144',
        },
        // Text
        text: {
          primary: '#e6edf3',
          secondary: '#8b949e',
          muted: '#484f5a',
          inverse: '#0d1117',
        },
        // Brand accent
        accent: {
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          muted: '#1e3a5f',
        },
        // Risk bands
        risk: {
          low: '#22c55e',
          'low-bg': '#052e16',
          'low-border': '#166534',
          medium: '#f59e0b',
          'medium-bg': '#1c1400',
          'medium-border': '#854d0e',
          high: '#ef4444',
          'high-bg': '#1c0505',
          'high-border': '#991b1b',
          critical: '#dc2626',
          'critical-bg': '#18040f',
          'critical-border': '#7f1d1d',
        },
        // Status
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#3b82f6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.4)',
        md: '0 4px 12px rgba(0,0,0,0.4)',
        lg: '0 8px 24px rgba(0,0,0,0.5)',
        glow: {
          low: '0 0 20px rgba(34,197,94,0.15)',
          medium: '0 0 20px rgba(245,158,11,0.15)',
          high: '0 0 20px rgba(239,68,68,0.2)',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideInRight: {
          from: { transform: 'translateX(100%)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
