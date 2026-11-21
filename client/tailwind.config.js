/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        govt: {
          navy: '#1a3c6e',
          'navy-light': '#2a5298',
          'navy-dark': '#0f2040',
          saffron: '#f47920',
          'saffron-dark': '#d96810',
          green: '#138808',
          'green-dark': '#0f6b06',
        },
        navy: {
          950: '#0a1628',
          900: '#0f2040',
          800: '#1a3c6e',
          700: '#2a5298',
          600: '#3b6ab5',
        },
        saffron: {
          DEFAULT: '#f47920',
          light: '#ff8f3d',
          dark: '#d96810',
          glow: 'rgba(244, 121, 32, 0.25)',
        },
        teal: {
          DEFAULT: '#f47920', // Align legacy teal to CivicLens signature saffron for uniform theme
          light: '#ff8f3d',
          dark: '#d96810',
          accent: '#ff9a4d'
        },
        civic: {
          navy: '#1a3c6e',
          saffron: '#f47920',
          green: '#138808',
          blue: '#2a5298',
          light: '#f8f9fa'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
