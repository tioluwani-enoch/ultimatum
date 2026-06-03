import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg", "assets/summer-os-banner.png"],
      manifest: {
        name: "Ultimate Summer OS",
        short_name: "Summer OS",
        description:
          "A local-first summer and life command center for training, food, routines, planning, and app-aware chat.",
        theme_color: "#f6f2eb",
        background_color: "#f6f2eb",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "192x192",
            type: "image/svg+xml",
            purpose: "any"
          },
          {
            src: "/icon.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"]
      }
    })
  ]
});
