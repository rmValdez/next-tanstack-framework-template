import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// TanStack Start (D20): collaboration is the reference for the interactive apps (collaboration,
// workspace). Env comes from the repo-root .env through `dotenv -e ../../.env` in the
// package scripts, like the Next apps.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  server: { port: 5020, strictPort: true },
  plugins: [
    // Must come before the React plugin.
    tanstackStart(),
    // Builds a Node server into .output (`node .output/server/index.mjs`).
    nitro(),
    viteReact(),
  ],
});
