/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Source Sans 3"', '"Source Sans Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        pluma: {
          50:  '#f0f5f4',
          100: '#d4e5e3',
          200: '#a9cac7',
          300: '#6da89f',
          400: '#3d8078',
          500: '#2a6660',
          600: '#1f5049',
          700: '#1a433e',
          800: '#17413B',
          900: '#0f2d29',
          950: '#081a17',
        },
        gold: {
          50:  '#fdf9ee',
          100: '#faefd3',
          200: '#f5dba2',
          300: '#edc668',
          400: '#e3b240',
          500: '#BC933F',
          600: '#a07c33',
          700: '#7d6127',
          800: '#5a451b',
          900: '#382b10',
        },
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -8px, 0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'slide-up': 'slideUp 520ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'fade-in': 'fadeIn 420ms ease-out both',
        float: 'float 5s ease-in-out infinite',
        shimmer: 'shimmer 2.6s linear infinite',
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 45, 41, 0.06), 0 10px 24px rgba(15, 45, 41, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
        'card-hover': '0 4px 10px rgba(15, 45, 41, 0.08), 0 18px 36px rgba(15, 45, 41, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        'glow-gold': '0 0 0 1px rgba(188, 147, 63, 0.22), 0 12px 28px rgba(188, 147, 63, 0.24)',
        'glow-pluma': '0 0 0 1px rgba(42, 102, 96, 0.18), 0 14px 30px rgba(23, 65, 59, 0.22)',
        sidebar: '12px 0 36px rgba(8, 26, 23, 0.28)',
        glass: '0 18px 36px rgba(15, 45, 41, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.72)',
      },
    },
  },
  plugins: [],
};
