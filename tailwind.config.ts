import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary — teal (distinct from superadmin's purple)
        primary: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Surface / background tokens
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f8fafb',
          border:  '#e4e9ee',
          hover:   '#f1f5f9',
        },
        // Dark mode surfaces
        dark: {
          bg:      '#0f1117',
          surface: '#1a1f2e',
          card:    '#222837',
          border:  '#2d3548',
          hover:   '#2a3042',
          muted:   '#3a4158',
        },
        // Steel palette (Phase 3 design system)
        steel: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#a0aec0',
          400: '#718096',
          500: '#4a5568',
          700: '#2d3748',
          900: '#1a202c',
        },
        // Status colours
        success: { DEFAULT: '#22c55e', light: '#dcfce7' },
        warning: { DEFAULT: '#f59e0b', light: '#fef3c7' },
        danger:  { DEFAULT: '#ef4444', light: '#fee2e2' },
        info:    { DEFAULT: '#3b82f6', light: '#dbeafe' },
      },
      fontFamily: {
        sans:    ['var(--font-body)', 'DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['var(--font-heading)', 'Space Grotesk', 'system-ui', 'sans-serif'],
        body:    ['var(--font-body)', 'DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.07)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.10)',
        dropdown: '0 8px 24px -4px rgb(0 0 0 / 0.14)',
      },
    },
  },
  plugins: [],
}
export default config
