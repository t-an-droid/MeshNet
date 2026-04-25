export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f5f4f0",
        surface: "#ffffff",
        primary: "#5a7fa8", // slate blue
        danger: "#cf7362", // muted red
        border: "#e5e5e5",
        textMain: "#333333",
        textMuted: "#777777",
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        mono: ['Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      }
    },
  },
  plugins: [],
}
