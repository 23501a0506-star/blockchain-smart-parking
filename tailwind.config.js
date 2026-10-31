/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        navy: {
          950: '#070d1a',
          900: '#0c1426',
          850: '#101a31',
          800: '#16223d',
          700: '#1e2d4a',
          600: '#2a3c5e',
          500: '#3a4d75',
        },
        teal: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(20,184,166,0.25), 0 8px 30px rgba(20,184,166,0.12)',
      },
    },
  },
  plugins: [],
};
