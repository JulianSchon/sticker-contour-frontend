import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        // Stable names so the PHP plugin can enqueue without reading a manifest.
        entryFileNames: "nimstick-game.js",
        assetFileNames: (info) =>
          info.name && info.name.endsWith(".css")
            ? "nimstick-game.css"
            : "assets/[name][extname]",
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
