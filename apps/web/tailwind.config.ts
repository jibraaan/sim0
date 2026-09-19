import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F7F5F0",
        ink: "#191A17",
        forest: { DEFAULT: "#1F4436", deep: "#142C23", tint: "#E8EFEA" },
        rule: "#DCD8CE",
      },
      fontFamily: {
        sans: ["var(--font-archivo)", "Archivo", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
} satisfies Config;
