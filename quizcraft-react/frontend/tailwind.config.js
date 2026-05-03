/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['DM Sans', 'system-ui', 'sans-serif'] },
      colors: {
        brand: { 50: '#fff1f0', 100: '#ffe0dd', 200: '#ffb8b3', 500: '#ff5a4d', 600: '#e8432f', 700: '#c43221', 900: '#7a1610' }
      }
    }
  },
  plugins: []
}
