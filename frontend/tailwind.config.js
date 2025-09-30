/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      screens: {
        mobile: { max: "980px" },
      },
    },
  },
  plugins: [],
}