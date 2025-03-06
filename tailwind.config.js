/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Keep existing brand colors and add dark mode variants
        'shopmium': {
          '50': '#fff0f6',
          '100': '#ffe3ee',
          '200': '#ffc6dd',
          '300': '#ff9bbe',
          '400': '#ff5f9a',
          '500': '#ff0066', // Primary brand color
          '600': '#ef005f',
          '700': '#d10054',
          '800': '#b00046',
          '900': '#8c0038',
        }
      }
    }
  },
  plugins: []
}