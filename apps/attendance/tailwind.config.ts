import type { Config } from "tailwindcss";
import uiPreset from "@workspace/ui/tailwind-preset";

const config: Config = {
  presets: [uiPreset],
  // The ui package glob is required: Tailwind only keeps classes it can see.
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};

export default config;
