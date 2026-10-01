/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sevengreen: '#008054',
        sevenorange: '#EF7C00',
        sevenred: '#E2001A',
      }
    },
  },
  plugins: [],
}