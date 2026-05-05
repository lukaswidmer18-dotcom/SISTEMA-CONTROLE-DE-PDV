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
    },
  },
  plugins: [],
};
