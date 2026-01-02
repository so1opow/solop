/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: "#16a34a",
        panel: "#111827",
        surface: "#0f172a"
      }
    }
  },
  plugins: []
};
