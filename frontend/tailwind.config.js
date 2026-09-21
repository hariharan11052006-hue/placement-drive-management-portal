/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe7fe',
          200: '#bfd3fe',
          300: '#93b4fd',
          400: '#608dfa',
          500: '#3b63f6',
          600: '#2549eb',
          700: '#1d3ad8',
          800: '#1e32af',
          900: '#1e2f8a',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.08)',
        pop: '0 8px 24px rgba(16,24,40,.12)',
      },
      borderRadius: {
        xl2: '14px',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .35s ease both',
        popIn: 'popIn .22s ease both',
      },
    },
  },
  plugins: [],
}
