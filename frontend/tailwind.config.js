/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  safelist: [
    { pattern: /(bg|text)-(blue|purple|indigo|cyan|green|amber|orange|rose|gray)-(100|200|600|700|800)/ },
  ],
  theme: { extend: {} },
  plugins: [],
};
