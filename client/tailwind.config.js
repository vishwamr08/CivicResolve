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
          850: '#15294e',
          800: '#1a3c6e',
          700: '#2a5298',
          600: '#3b6ab5',
          50: '#f0f4f9',
        },
        saffron: {
          DEFAULT: '#f47920',
          light: '#ff8f3d',
          dark: '#d96810',
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
        },
        green: {
          govt: '#138808',
          'govt-dark': '#0f6b06',
        },
        teal: {
          DEFAULT: '#0d9488',
          dark: '#0f766e',
          light: '#14b8a6',
          accent: '#2dd4bf',
        },
        civic: {
          navy: '#1a3c6e',
          saffron: '#f47920',
          green: '#138808',
          blue: '#2a5298',
          canvas: '#f8f9fa',
          surface: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          muted: '#64748b'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}
