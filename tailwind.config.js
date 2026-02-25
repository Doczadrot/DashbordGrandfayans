/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Nunito',
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"Segoe UI"',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ios: {
          blue: '#0A84FF', // Lighter blue for dark mode
          gray: '#8E8E93',
          'light-gray': '#1C1C1E', // Dark gray for panels
          background: '#000000', // Deep black/blue background base
          green: '#30D158',
          red: '#FF453A',
          yellow: '#FFD60A',
          'dark-blue': '#051328', // Deep dark blue for main background
        },
      },
      borderRadius: {
        'ios': '12px',
      },
      backdropBlur: {
        'xs': '2px',
      }
    },
  },
  plugins: [],
}