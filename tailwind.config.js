/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // This covers everything inside src
    "./app/**/*.{js,ts,jsx,tsx,mdx}", // Just in case you have files outside src
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        solana: {
          purple: '#9945FF',
          green: '#14F195',
        }
      }
    },
  },
  plugins: [],
}
