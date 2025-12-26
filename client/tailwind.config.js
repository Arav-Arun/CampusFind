/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#202124",
        surface: "#303134",
        primary: "#8AB4F8", // Google Blue/Cyan-ish
        secondary: "#5F6368",
        accent: "#00BCD4", // Cyan
        text: "#E8EAED",
        muted: "#9AA0A6",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"], // Professional font
      },
    },
  },
  plugins: [],
};
