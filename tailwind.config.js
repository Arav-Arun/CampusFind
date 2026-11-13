const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: token("paper"),
        surface: token("card"),
        subtle: token("subtle"),
        line: token("line"),
        text: token("ink"),
        muted: token("muted"),
        accent: token("brand"),
        "accent-strong": token("brand-strong"),
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
