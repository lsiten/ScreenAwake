import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: "src/frontend",
  clearScreen: false,
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
