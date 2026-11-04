/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'system-ui', 'sans-serif'],
      },
      colors: {
        ivory: {
          50: '#FDFBF7',
          100: '#FAF6EF',
          200: '#F3ECE0',
          300: '#E9DFCF',
        },
        blush: {
          50: '#FDF6F5',
          100: '#F9EBE9',
          200: '#F2D9D5',
          300: '#E8BFB9',
        },
        rose: {
          400: '#C08A8D',
          500: '#A86B70',
          600: '#8E5359',
        },
        burgundy: {
          600: '#7E3A46',
          700: '#6A2E3A',
          800: '#4F2029',
          900: '#361419',
        },
        gold: {
          400: '#D2B27C',
          500: '#B8945A',
          600: '#8F6F3E',
        },
        ink: {
          900: '#231C1E',
          800: '#352C2E',
          700: '#4D4345',
          500: '#7A6E70',
          400: '#978B8D',
          300: '#CFC5C2',
          200: '#E6DFDC',
        },
        success: { 600: '#3C7457', 100: '#E4F1EA' },
        warning: { 600: '#9A6512', 100: '#FBF0DA' },
        error: { 600: '#B3261E', 100: '#F9E4E2' },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(35, 28, 30, 0.04), 0 8px 24px rgba(35, 28, 30, 0.06)',
        lift: '0 2px 4px rgba(35, 28, 30, 0.05), 0 18px 40px rgba(35, 28, 30, 0.12)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'bag-pop': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-in-left': 'slide-in-left 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'bag-pop': 'bag-pop 0.45s ease-out',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
};
