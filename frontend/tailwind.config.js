/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: token("paper"), // page
        surface: token("card"), // raised panels
        subtle: token("subtle"), // fields, hovers
        line: token("line"), // borders and dividers
        text: token("ink"),
        muted: token("muted"),
        accent: token("brand"), // actions only
        "accent-strong": token("brand-strong"),
        // Item and claim states. Colour always means a state, never decoration.
        lost: token("lost"),
        found: token("found"),
        progress: token("progress"),
        recovered: token("recovered"),
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
