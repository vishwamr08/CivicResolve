/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070F1E',
          900: '#0A192F',
          800: '#112240',
          700: '#1E3A5F',
          600: '#274A78',
        },
        teal: {
          DEFAULT: '#0D9488',
          light: '#14B8A6',
          dark: '#0F766E',
          accent: '#2DD4BF'
        },
        civic: {
          blue: '#1D4ED8',
          sky: '#0284C7',
          light: '#F0F7FF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
