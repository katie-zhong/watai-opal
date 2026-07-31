import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1B1A17",
        paper: "#F6F6F3",
        line: "#E4E2DC",
        accent: "#E8621A",
        "accent-soft": "#FBEADF",
        "sla-green": "#1E8A5B",
        "sla-amber": "#C77D0A",
        "sla-red": "#C2372B",
        muted: "#6E6A61"
      },
      fontFamily: {
        sans: ["var(--font-plex)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"]
      }
    }
  },
  plugins: []
};
export default config;
