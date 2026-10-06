import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/**
 * Shared theme for every app. Apps use it with:
 *
 *   presets: [uiPreset],
 *   content: ["./src/**\/*.{ts,tsx}", "../../packages/ui/src/**\/*.{ts,tsx}"],
 *
 * The second content glob matters: without it Tailwind never sees the classes used
 * inside these components and purges them.
 */
const preset = {
  content: [],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [
    // Defined here rather than in each app's globals.css, because `Card` depends on
    // `glass-card` and would render unstyled in an app that forgot to copy it.
    plugin(({ addComponents, addUtilities }) => {
      addComponents({
        ".glass": {
          background: "rgba(11, 21, 40, 0.7)",
          backdropFilter: "blur(16px) saturate(180%)",
          WebkitBackdropFilter: "blur(16px) saturate(180%)",
          border: "1px solid rgba(34, 211, 238, 0.18)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.4)",
        },
        ".glass-card": {
          background: "rgba(15, 28, 52, 0.6)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(34, 211, 238, 0.12)",
        },
      });
      addUtilities({
        ".text-gradient": {
          background: "linear-gradient(135deg, #ffffff 0%, #38bdf8 50%, #22d3ee 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        },
      });
    }),
  ],
} satisfies Config;

export default preset;
