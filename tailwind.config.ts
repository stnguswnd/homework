import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        line: "#d8dee9",
        paper: "#f7f9fc",
        action: "#2563eb",
        success: "#15803d",
        warn: "#b45309",
        danger: "#dc2626"
      },
      boxShadow: {
        soft: "0 8px 28px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
